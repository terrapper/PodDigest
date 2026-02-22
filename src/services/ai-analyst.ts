import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { ScoreDimensions, ClipCandidate, TranscriptSegment } from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface AnalysisWindow {
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  startTime: number;
  endTime: number;
  text: string;
  speakers: string[];
}

interface AnalysisConfig {
  narrationDepth: string;
  userPreferences?: Record<string, unknown>;
}

interface SelectionConfig {
  targetLengthMinutes: number;
  clipLengthPref: string;
  breadthDepth: number;
  structure: string;
}

// ─── Constants ────────────────────────────────────────────────

const WINDOW_DURATION_SECONDS = 180; // ~3 minutes
const WINDOW_STEP_SECONDS = 90; // 1.5 minute overlap
const MIN_SCORE_THRESHOLD = 40;
const API_DELAY_MS = 200;
const PARALLEL_BATCH_SIZE = 5;
const NARRATION_RATIO = 0.15; // 15% of digest is narration

const CLIP_LENGTH_RANGES: Record<string, { min: number; max: number }> = {
  SHORT: { min: 120, max: 240 }, // 2-4 min in seconds
  MEDIUM: { min: 240, max: 480 }, // 4-8 min
  LONG: { min: 480, max: 900 }, // 8-15 min
  MIXED: { min: 120, max: 900 }, // full range
};

const DIMENSION_WEIGHTS: Record<keyof ScoreDimensions, number> = {
  insightDensity: 0.25,
  emotionalIntensity: 0.20,
  actionability: 0.20,
  topicalRelevance: 0.20,
  conversationalQuality: 0.15,
};

// ─── Claude API Client ───────────────────────────────────────

const anthropic = new Anthropic();

// ─── Scoring ──────────────────────────────────────────────────

export function computeWeightedScore(dimensions: ScoreDimensions): number {
  return (
    dimensions.insightDensity * DIMENSION_WEIGHTS.insightDensity +
    dimensions.emotionalIntensity * DIMENSION_WEIGHTS.emotionalIntensity +
    dimensions.actionability * DIMENSION_WEIGHTS.actionability +
    dimensions.topicalRelevance * DIMENSION_WEIGHTS.topicalRelevance +
    dimensions.conversationalQuality * DIMENSION_WEIGHTS.conversationalQuality
  );
}

// ─── Segment Window Scoring ──────────────────────────────────

const SYSTEM_PROMPT = `You are an expert podcast analyst. Your job is to evaluate transcript segments from podcast episodes and score them across five quality dimensions. You assess how compelling, insightful, and valuable each segment would be for a listener who wants the best highlights from their podcast subscriptions.

Score each dimension from 0 to 100:
- insightDensity: Novel information, unique perspectives, surprising data points, expert knowledge
- emotionalIntensity: Compelling storytelling, humor, vulnerability, passion, memorable moments
- actionability: Practical takeaways, concrete advice, steps the listener can apply
- topicalRelevance: General interest and broad appeal of the topic being discussed
- conversationalQuality: Great dialogue flow, chemistry between speakers, memorable exchanges

Respond ONLY with valid JSON in this exact format:
{
  "insightDensity": <number 0-100>,
  "emotionalIntensity": <number 0-100>,
  "actionability": <number 0-100>,
  "topicalRelevance": <number 0-100>,
  "conversationalQuality": <number 0-100>,
  "summary": "<one sentence describing what makes this segment compelling or why it scores low>",
  "speakers": ["<speaker names identified in the segment>"]
}

Do not include any text outside the JSON object.`;

function buildUserPrompt(
  window: AnalysisWindow,
  config: AnalysisConfig
): string {
  const preferencesNote = config.userPreferences
    ? `\n\nUser preferences context: ${JSON.stringify(config.userPreferences)}`
    : "";

  return `Analyze this podcast transcript segment and score it.

Podcast: "${window.podcastTitle}"
Episode: "${window.episodeTitle}"
Timestamp: ${formatTimestamp(window.startTime)} - ${formatTimestamp(window.endTime)}
Speakers in segment: ${window.speakers.length > 0 ? window.speakers.join(", ") : "Unknown"}
${preferencesNote}

--- TRANSCRIPT ---
${window.text}
--- END TRANSCRIPT ---`;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function scoreSegmentWindow(
  window: AnalysisWindow,
  config: AnalysisConfig
): Promise<ClipCandidate | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(window, config),
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return null;
    }

    const parsed = JSON.parse(textBlock.text);

    const dimensions: ScoreDimensions = {
      insightDensity: clampScore(parsed.insightDensity),
      emotionalIntensity: clampScore(parsed.emotionalIntensity),
      actionability: clampScore(parsed.actionability),
      topicalRelevance: clampScore(parsed.topicalRelevance),
      conversationalQuality: clampScore(parsed.conversationalQuality),
    };

    const score = computeWeightedScore(dimensions);

    if (score < MIN_SCORE_THRESHOLD) {
      return null;
    }

    return {
      episodeId: window.episodeId,
      episodeTitle: window.episodeTitle,
      podcastTitle: window.podcastTitle,
      startTime: window.startTime,
      endTime: window.endTime,
      score,
      scoreDimensions: dimensions,
      summary: parsed.summary ?? "",
      speakers: parsed.speakers ?? window.speakers,
      text: window.text,
    };
  } catch (error) {
    console.error(
      `Failed to score window [${window.episodeTitle} ${formatTimestamp(window.startTime)}-${formatTimestamp(window.endTime)}]:`,
      error
    );
    return null;
  }
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

// ─── Sliding Window Construction ─────────────────────────────

function buildAnalysisWindows(
  episodeId: string,
  episodeTitle: string,
  podcastTitle: string,
  segments: TranscriptSegment[]
): AnalysisWindow[] {
  if (segments.length === 0) return [];

  const windows: AnalysisWindow[] = [];
  const totalDuration = segments[segments.length - 1].end;

  let windowStart = segments[0].start;

  while (windowStart < totalDuration) {
    const windowEnd = windowStart + WINDOW_DURATION_SECONDS;

    const windowSegments = segments.filter(
      (seg) => seg.end > windowStart && seg.start < windowEnd
    );

    if (windowSegments.length === 0) {
      windowStart += WINDOW_STEP_SECONDS;
      continue;
    }

    const actualStart = Math.max(windowStart, windowSegments[0].start);
    const actualEnd = Math.min(
      windowEnd,
      windowSegments[windowSegments.length - 1].end
    );

    const text = windowSegments
      .map((seg) => {
        const prefix = seg.speaker ? `[${seg.speaker}]: ` : "";
        return `${prefix}${seg.text}`;
      })
      .join("\n");

    const speakerSet = new Set(
      windowSegments
        .map((seg) => seg.speaker)
        .filter((s): s is string => !!s)
    );
    const speakers = Array.from(speakerSet);

    windows.push({
      episodeId,
      episodeTitle,
      podcastTitle,
      startTime: actualStart,
      endTime: actualEnd,
      text,
      speakers,
    });

    windowStart += WINDOW_STEP_SECONDS;
  }

  return windows;
}

// ─── Clip Selection ──────────────────────────────────────────

export function selectClips(
  candidates: ClipCandidate[],
  config: SelectionConfig
): ClipCandidate[] {
  if (candidates.length === 0) return [];

  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  // Available content time is ~85% of target length (15% is narration)
  const availableSeconds =
    config.targetLengthMinutes * 60 * (1 - NARRATION_RATIO);

  // Determine clip length range based on preference
  const lengthRange = CLIP_LENGTH_RANGES[config.clipLengthPref] ?? CLIP_LENGTH_RANGES.MIXED;

  // Apply breadthDepth influence on clip length filtering:
  // breadthDepth 0 = favor many short clips from many episodes
  // breadthDepth 100 = favor fewer long clips from fewer episodes
  const breadthFactor = config.breadthDepth / 100;

  // Adjust effective min/max based on breadth-depth slider
  const effectiveMin = lengthRange.min + breadthFactor * (lengthRange.max - lengthRange.min) * 0.3;
  const effectiveMax = lengthRange.max - (1 - breadthFactor) * (lengthRange.max - lengthRange.min) * 0.3;

  const selected: ClipCandidate[] = [];
  let totalDuration = 0;
  const episodeClipCounts: Record<string, number> = {};

  // Maximum clips per episode: influenced by breadth-depth slider
  // Lower breadthDepth = stricter per-episode limit (more breadth)
  // Higher breadthDepth = more relaxed per-episode limit (more depth)
  const maxClipsPerEpisode = Math.max(1, Math.round(1 + breadthFactor * 4));

  for (const candidate of sorted) {
    const clipDuration = candidate.endTime - candidate.startTime;

    // Skip if clip is outside effective length range (with some tolerance)
    if (clipDuration < effectiveMin * 0.7 || clipDuration > effectiveMax * 1.3) {
      continue;
    }

    // Check if adding this clip would exceed available time
    if (totalDuration + clipDuration > availableSeconds) {
      continue;
    }

    // Check per-episode limit
    const episodeCount = episodeClipCounts[candidate.episodeId] ?? 0;
    if (episodeCount >= maxClipsPerEpisode) {
      continue;
    }

    // Check for overlapping clips from the same episode
    const hasOverlap = selected.some(
      (existing) =>
        existing.episodeId === candidate.episodeId &&
        existing.startTime < candidate.endTime &&
        existing.endTime > candidate.startTime
    );
    if (hasOverlap) {
      continue;
    }

    selected.push(candidate);
    totalDuration += clipDuration;
    episodeClipCounts[candidate.episodeId] = episodeCount + 1;

    // Stop if we have enough content
    if (totalDuration >= availableSeconds) {
      break;
    }
  }

  // Order selected clips based on structure preference
  return orderClipsByStructure(selected, config.structure);
}

function orderClipsByStructure(
  clips: ClipCandidate[],
  structure: string
): ClipCandidate[] {
  switch (structure) {
    case "BY_SCORE":
      return [...clips].sort((a, b) => b.score - a.score);

    case "BY_SHOW":
      return [...clips].sort((a, b) => {
        const showCompare = a.podcastTitle.localeCompare(b.podcastTitle);
        if (showCompare !== 0) return showCompare;
        return a.startTime - b.startTime;
      });

    case "BY_TOPIC":
      // Topic grouping would ideally use AI clustering; for now, group by show
      // then by score within each show as an approximation
      return [...clips].sort((a, b) => {
        const showCompare = a.podcastTitle.localeCompare(b.podcastTitle);
        if (showCompare !== 0) return showCompare;
        return b.score - a.score;
      });

    case "CHRONOLOGICAL":
      return [...clips].sort((a, b) => {
        // Sort by episode (assuming episodeId ordering correlates with recency)
        const episodeCompare = a.episodeId.localeCompare(b.episodeId);
        if (episodeCompare !== 0) return episodeCompare;
        return a.startTime - b.startTime;
      });

    default:
      return clips;
  }
}

// ─── Batch Processing Helpers ────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processWindowBatch(
  windows: AnalysisWindow[],
  config: AnalysisConfig
): Promise<ClipCandidate[]> {
  const results = await Promise.all(
    windows.map((window) => scoreSegmentWindow(window, config))
  );
  return results.filter((r): r is ClipCandidate => r !== null);
}

async function processEpisodeWindows(
  windows: AnalysisWindow[],
  config: AnalysisConfig
): Promise<ClipCandidate[]> {
  const allCandidates: ClipCandidate[] = [];

  for (let i = 0; i < windows.length; i += PARALLEL_BATCH_SIZE) {
    const batch = windows.slice(i, i + PARALLEL_BATCH_SIZE);
    const batchResults = await processWindowBatch(batch, config);
    allCandidates.push(...batchResults);

    // Rate limit: add delay between batches
    if (i + PARALLEL_BATCH_SIZE < windows.length) {
      await delay(API_DELAY_MS);
    }
  }

  return allCandidates;
}

// ─── Main Entry Point ────────────────────────────────────────

export async function analyzeTranscripts(
  digestId: string,
  episodeIds: string[],
  userPreferences?: Record<string, unknown>
): Promise<string[]> {
  // Fetch the digest with its config
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
    include: { config: true },
  });

  const digestConfig = digest.config;

  // Build analysis config from digest config
  const analysisConfig: AnalysisConfig = {
    narrationDepth: digestConfig.narrationDepth,
    userPreferences,
  };

  const selectionConfig: SelectionConfig = {
    targetLengthMinutes: digestConfig.targetLength,
    clipLengthPref: digestConfig.clipLengthPref,
    breadthDepth: digestConfig.breadthDepth,
    structure: digestConfig.structure,
  };

  // Fetch transcripts for all episodes
  const episodes = await prisma.episode.findMany({
    where: {
      id: { in: episodeIds },
      transcriptStatus: "COMPLETED",
    },
    include: {
      transcript: true,
      podcast: true,
    },
  });

  if (episodes.length === 0) {
    throw new Error(
      `No completed transcripts found for episodes: ${episodeIds.join(", ")}`
    );
  }

  // Process each episode sequentially, windows within each episode in parallel batches
  const allCandidates: ClipCandidate[] = [];

  for (const episode of episodes) {
    if (!episode.transcript?.segments) {
      console.warn(
        `Skipping episode "${episode.title}" — no transcript segments`
      );
      continue;
    }

    const segments = episode.transcript.segments as unknown as TranscriptSegment[];

    if (segments.length === 0) {
      continue;
    }

    const windows = buildAnalysisWindows(
      episode.id,
      episode.title,
      episode.podcast.title,
      segments
    );

    console.log(
      `Analyzing episode "${episode.title}" — ${windows.length} windows`
    );

    const episodeCandidates = await processEpisodeWindows(
      windows,
      analysisConfig
    );

    allCandidates.push(...episodeCandidates);

    // Delay between episodes for rate limiting
    if (episodes.indexOf(episode) < episodes.length - 1) {
      await delay(API_DELAY_MS);
    }
  }

  console.log(
    `Found ${allCandidates.length} candidate clips above threshold (${MIN_SCORE_THRESHOLD})`
  );

  // Select the best clips based on config
  const selectedClips = selectClips(allCandidates, selectionConfig);

  console.log(
    `Selected ${selectedClips.length} clips for digest (target: ${selectionConfig.targetLengthMinutes}min)`
  );

  // Persist DigestClip records to the database
  const createdClipIds: string[] = [];

  for (let i = 0; i < selectedClips.length; i++) {
    const clip = selectedClips[i];

    const digestClip = await prisma.digestClip.create({
      data: {
        digestId,
        episodeId: clip.episodeId,
        startTime: Math.round(clip.startTime),
        endTime: Math.round(clip.endTime),
        score: clip.score,
        scoreDimensions: clip.scoreDimensions as unknown as Record<string, number>,
        position: i,
      },
    });

    createdClipIds.push(digestClip.id);
  }

  // Update the digest clip count
  await prisma.digest.update({
    where: { id: digestId },
    data: { clipCount: createdClipIds.length },
  });

  return createdClipIds;
}
