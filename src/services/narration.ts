import Anthropic from "@anthropic-ai/sdk";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, STORAGE_BUCKET } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { NarrationScript, NarrationAudio } from "@/types";

const anthropic = new Anthropic();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

const NARRATION_DEPTH_GUIDELINES = {
  BRIEF: {
    transitionSentences: "1-2 sentences",
    transitionDuration: "~15 seconds",
    introSentences: "2-3 sentences",
    outroSentences: "1-2 sentences",
    style: "Minimal and snappy. Just name the show, host, and topic in a few words.",
  },
  STANDARD: {
    transitionSentences: "2-4 sentences",
    transitionDuration: "~30 seconds",
    introSentences: "4-6 sentences",
    outroSentences: "2-4 sentences",
    style:
      "Provide enough context so the listener knows what they are about to hear and why it matters. Be conversational.",
  },
  DETAILED: {
    transitionSentences: "4-6 sentences",
    transitionDuration: "~45 seconds",
    introSentences: "6-8 sentences",
    outroSentences: "4-6 sentences",
    style:
      "Give rich context: background on the guest, why this topic is timely, how it connects to other segments in the digest. Draw the listener in with a teaser.",
  },
} as const;

function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / 2.5);
}

function formatClipDuration(startTime: number, endTime: number): string {
  const durationSec = endTime - startTime;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export async function generateNarrationScripts(
  digestId: string
): Promise<NarrationScript[]> {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
    include: {
      config: true,
      clips: {
        orderBy: { position: "asc" },
        include: {
          episode: {
            include: {
              podcast: true,
            },
          },
        },
      },
    },
  });

  const { config, clips } = digest;
  const depth = config.narrationDepth as keyof typeof NARRATION_DEPTH_GUIDELINES;
  const guidelines = NARRATION_DEPTH_GUIDELINES[depth];

  const clipSummaries = clips.map((clip, index) => {
    const ep = clip.episode;
    const pod = ep.podcast;
    const duration = formatClipDuration(clip.startTime, clip.endTime);
    return [
      `Segment ${index + 1}:`,
      `  Podcast: "${pod.title}" by ${pod.author || "Unknown"}`,
      `  Episode: "${ep.title}"`,
      `  Clip duration: ${duration}`,
      `  Score: ${clip.score.toFixed(1)}/100`,
    ].join("\n");
  });

  const weekLabel = digest.weekStart
    ? `Week of ${digest.weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : "This week";

  const systemPrompt = [
    "You are the narrator for PodDigest AI, a weekly podcast digest.",
    "Your role is to be a warm, knowledgeable, and concise guide between podcast segments.",
    "You never replace the original podcast voices — you introduce and contextualize them.",
    "Speak directly to the listener in second person. Be natural and conversational, like a trusted friend who listens to a lot of podcasts.",
    "Never use markdown, bullet points, or formatting. Write plain spoken narration only.",
    "Do not include any stage directions, sound cues, or labels like '[INTRO]' in your output.",
  ].join(" ");

  const userPrompt = [
    `Generate narration scripts for a podcast digest titled "${digest.title}".`,
    `${weekLabel}. The digest contains ${clips.length} segments from various podcasts.`,
    "",
    "Here are the segments in order:",
    "",
    clipSummaries.join("\n\n"),
    "",
    `Narration depth: ${depth}`,
    `Guidelines: ${guidelines.style}`,
    "",
    "Please write the following narration scripts, separated by the exact delimiter '---SCRIPT---' on its own line:",
    "",
    `1. INTRO (${guidelines.introSentences}): Welcome the listener to this week's PodDigest. Preview the highlights — mention a few podcast names and tease what makes this week's clips interesting. Build anticipation.`,
    "",
    ...clips.map(
      (clip, i) =>
        `${i + 2}. TRANSITION for Segment ${i + 1} (${guidelines.transitionSentences}): Introduce the upcoming clip from "${clip.episode.podcast.title}" — the episode "${clip.episode.title}". Give the listener context for what they are about to hear.`
    ),
    "",
    `${clips.length + 2}. OUTRO (${guidelines.outroSentences}): Wrap up the digest. Thank the listener. Mention that a new digest will arrive next week. End on an upbeat note.`,
    "",
    `Output ONLY the narration text for each script, separated by '---SCRIPT---'. No labels, no numbering, no headers.`,
  ].join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const scriptTexts = responseText
    .split("---SCRIPT---")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const expectedCount = clips.length + 2; // intro + transitions + outro

  if (scriptTexts.length < expectedCount) {
    throw new Error(
      `Expected ${expectedCount} narration scripts but received ${scriptTexts.length}`
    );
  }

  const scripts: NarrationScript[] = [];

  scripts.push({
    type: "intro",
    text: scriptTexts[0],
    position: 0,
  });

  for (let i = 0; i < clips.length; i++) {
    scripts.push({
      type: "transition",
      text: scriptTexts[i + 1],
      position: i + 1,
    });
  }

  scripts.push({
    type: "outro",
    text: scriptTexts[scriptTexts.length - 1],
    position: clips.length + 1,
  });

  return scripts;
}

export async function synthesizeNarration(
  scripts: NarrationScript[],
  voiceId: string,
  digestId: string
): Promise<NarrationAudio[]> {
  const narrationAudios: NarrationAudio[] = [];

  for (const script of scripts) {
    const ttsResponse = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.text();
      throw new Error(
        `ElevenLabs TTS failed (${ttsResponse.status}): ${errorBody}`
      );
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const s3Key = `digests/${digestId}/narration/${script.position}-${script.type}.mp3`;

    await s3.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      })
    );

    const duration = estimateDuration(script.text);

    narrationAudios.push({
      type: script.type,
      s3Key,
      duration,
      position: script.position,
    });
  }

  return narrationAudios;
}

export async function generateAndSynthesizeNarration(
  digestId: string
): Promise<NarrationAudio[]> {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
    include: { config: true },
  });

  const voiceId = digest.config.voiceId;
  const scripts = await generateNarrationScripts(digestId);
  const narrationAudios = await synthesizeNarration(scripts, voiceId, digestId);

  return narrationAudios;
}
