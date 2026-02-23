import { prisma } from "@/lib/prisma";
import type { TranscriptSegment } from "@/types";

// ─── Deepgram Response Types ──────────────────────────────────

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface DeepgramUtterance {
  start: number;
  end: number;
  speaker: number;
  transcript: string;
  words: DeepgramWord[];
}

interface DeepgramParagraph {
  start: number;
  end: number;
  speaker: number;
  sentences: Array<{ text: string; start: number; end: number }>;
}

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        words: DeepgramWord[];
        paragraphs?: {
          paragraphs: DeepgramParagraph[];
        };
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
}

// ─── Environment ──────────────────────────────────────────────

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// ─── Main Transcription Function ──────────────────────────────

export async function transcribeEpisode(
  episodeId: string,
  audioUrl: string
): Promise<{ transcriptId: string; segmentCount: number }> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY environment variable is not set");
  }

  // Set episode status to PROCESSING
  await prisma.episode.update({
    where: { id: episodeId },
    data: { transcriptStatus: "PROCESSING" },
  });

  try {
    // Call Deepgram pre-recorded API
    const queryParams = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      diarize: "true",
      punctuate: "true",
      paragraphs: "true",
      utterances: "true",
    });

    const deepgramUrl = `https://api.deepgram.com/v1/listen?${queryParams.toString()}`;

    const response = await fetch(deepgramUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Deepgram API error (${response.status}): ${errorBody}`
      );
    }

    const deepgramResponse: DeepgramResponse = await response.json();

    // Parse the Deepgram response into our format
    const { fullText, segments } = parseDeepgramResponse(deepgramResponse);

    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Deepgram returned an empty transcript");
    }

    // Detect language from the first channel if available
    const language = "en";

    // Store transcript in database
    const transcript = await prisma.transcript.upsert({
      where: { episodeId },
      create: {
        episodeId,
        fullText,
        segments: segments as unknown as import("@prisma/client").Prisma.InputJsonValue,
        language,
        status: "COMPLETED",
      },
      update: {
        fullText,
        segments: segments as unknown as import("@prisma/client").Prisma.InputJsonValue,
        language,
        status: "COMPLETED",
        error: null,
      },
    });

    // Update episode status to COMPLETED
    await prisma.episode.update({
      where: { id: episodeId },
      data: { transcriptStatus: "COMPLETED" },
    });

    return {
      transcriptId: transcript.id,
      segmentCount: segments.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown transcription error";

    // Store error in transcript record if one exists, otherwise create a failed one
    await prisma.transcript.upsert({
      where: { episodeId },
      create: {
        episodeId,
        fullText: "",
        status: "FAILED",
        error: errorMessage,
      },
      update: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    // Update episode status to FAILED
    await prisma.episode.update({
      where: { id: episodeId },
      data: { transcriptStatus: "FAILED" },
    });

    throw new Error(`Transcription failed for episode ${episodeId}: ${errorMessage}`);
  }
}

// ─── Deepgram Response Parser ─────────────────────────────────

export function parseDeepgramResponse(response: DeepgramResponse): {
  fullText: string;
  segments: TranscriptSegment[];
} {
  const channel = response.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    return { fullText: "", segments: [] };
  }

  const fullText = alternative.transcript ?? "";

  // Prefer utterances for segment boundaries (most natural speaker turns)
  const utterances = response.results.utterances;
  if (utterances && utterances.length > 0) {
    const segments = parseFromUtterances(utterances);
    return { fullText, segments };
  }

  // Fall back to paragraph grouping
  const paragraphs = alternative.paragraphs?.paragraphs;
  if (paragraphs && paragraphs.length > 0) {
    const segments = parseFromParagraphs(paragraphs);
    return { fullText, segments };
  }

  // Last resort: group words by speaker from the word-level data
  const words = alternative.words;
  if (words && words.length > 0) {
    const segments = parseFromWords(words);
    return { fullText, segments };
  }

  return { fullText, segments: [] };
}

// ─── Parsing Strategies ───────────────────────────────────────

function parseFromUtterances(
  utterances: DeepgramUtterance[]
): TranscriptSegment[] {
  return utterances.map((utterance) => ({
    start: utterance.start,
    end: utterance.end,
    speaker: `Speaker ${utterance.speaker}`,
    text: utterance.transcript.trim(),
  }));
}

function parseFromParagraphs(
  paragraphs: DeepgramParagraph[]
): TranscriptSegment[] {
  return paragraphs.map((paragraph) => {
    const text = paragraph.sentences.map((s) => s.text).join(" ");
    return {
      start: paragraph.start,
      end: paragraph.end,
      speaker: `Speaker ${paragraph.speaker}`,
      text: text.trim(),
    };
  });
}

function parseFromWords(words: DeepgramWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  if (words.length === 0) {
    return segments;
  }

  let currentSpeaker = words[0].speaker ?? 0;
  let segmentStart = words[0].start;
  let segmentWords: string[] = [];
  let segmentEnd = words[0].end;

  for (const word of words) {
    const speaker = word.speaker ?? 0;

    if (speaker !== currentSpeaker) {
      // Speaker changed, finalize the current segment
      segments.push({
        start: segmentStart,
        end: segmentEnd,
        speaker: `Speaker ${currentSpeaker}`,
        text: segmentWords.join(" ").trim(),
      });

      // Start a new segment
      currentSpeaker = speaker;
      segmentStart = word.start;
      segmentWords = [];
    }

    segmentWords.push(word.punctuated_word ?? word.word);
    segmentEnd = word.end;
  }

  // Push the final segment
  if (segmentWords.length > 0) {
    segments.push({
      start: segmentStart,
      end: segmentEnd,
      speaker: `Speaker ${currentSpeaker}`,
      text: segmentWords.join(" ").trim(),
    });
  }

  return segments;
}
