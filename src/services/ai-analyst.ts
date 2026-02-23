import { anthropic } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import type { ScoreDimensions, ClipCandidate, TranscriptSegment } from "@/types";

// ─── Types ────────────────────────────────────────────────────

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

const MIN_SCORE_THRESHOLD = 40;
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

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

// ─── Transcript Formatting ──────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTranscriptCompact(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => {
      const ts = formatTimestamp(seg.start);
      const speaker = seg.speaker ? ` [${seg.speaker}]:` : ":";
      return `[${ts}]${speaker} ${seg.text}`;
    })
    .join("\n");
}

// ─── Single-Call Episode Analysis ───────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are an expert podcast analyst. Given a full episode transcript with timestamps, identify the 10-15 most compelling segments that would make great highlights for a weekly podcast digest.

Score each segment across 5 dimensions (0-100):
- insightDensity: Novel information, unique perspectives, surprising data points, expert knowledge
- emotionalIntensity: Compelling storytelling, humor, vulnerability, passion, memorable moments
- actionability: Practical takeaways, concrete advice, steps the listener can apply
- topicalRelevance: General interest and broad appeal of the topic being discussed
- conversationalQuality: Great dialogue flow, chemistry between speakers, memorable exchanges

Each segment should be 2-15 minutes long (120-900 seconds). Prefer segments that form complete, self-contained thoughts or discussions.

Respond ONLY with a valid JSON array of segment objects. No text outside the JSON array.
Each object must have exactly these fields:
{
  "startTime": <number, seconds from episode start>,
  "endTime": <number, seconds from episode start>,
  "insightDensity": <number 0-100>,
  "emotionalIntensity": <number 0-100>,
  "actionability": <number 0-100>,
  "topicalRelevance": <number 0-100>,
  "conversationalQuality": <number 0-100>,
  "summary": "<one sentence describing what makes this segment compelling>",
  "speakers": ["<speaker names or identifiers>"]
}`;

interface RawSegmentResponse {
  startTime: number;
  endTime: number;
  insightDensity: number;
  emotionalIntensity: number;
  actionability: number;
  topicalRelevance: number;
  conversationalQuality: number;
  summary: string;
  speakers: string[];
}

async function analyzeEpisodeTranscript(
  episodeId: string,
  episodeTitle: string,
  podcastTitle: string,
  segments: TranscriptSegment[],
  config: AnalysisConfig
): Promise<ClipCandidate[]> {
  const transcript = formatTranscriptCompact(segments);

  const preferencesNote = config.userPreferences
    ? `\n\nUser preferences: ${JSON.stringify(config.userPreferences)}`
    : "";

  const userPrompt = `Analyze this podcast episode and identify the best segments for a digest.

Podcast: "${podcastTitle}"
Episode: "${episodeTitle}"
Total segments: ${segments.length}
Episode duration: ~${formatTimestamp(segments[segments.length - 1].end)}${preferencesNote}

--- TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!text) {
      console.error(`Empty response for episode "${episodeTitle}"`);
      return [];
    }

    // Extract JSON array — handle possible markdown code fences
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(
        `No JSON array found in response for episode "${episodeTitle}"`
      );
      return [];
    }

    const parsed: RawSegmentResponse[] = JSON.parse(jsonMatch[0]);

    const candidates: ClipCandidate[] = [];

    for (const seg of parsed) {
      const dimensions: ScoreDimensions = {
        insightDensity: clampScore(seg.insightDensity),
        emotionalIntensity: clampScore(seg.emotionalIntensity),
        actionability: clampScore(seg.actionability),
        topicalRelevance: clampScore(seg.topicalRelevance),
        conversationalQuality: clampScore(seg.conversationalQuality),
      };

      const score = computeWeightedScore(dimensions);

      if (score < MIN_SCORE_THRESHOLD) {
        continue;
      }

      // Reconstruct the text for this segment from the original transcript segments
      const clipSegments = segments.filter(
        (s) => s.end > seg.startTime && s.start < seg.endTime
      );
      const clipText = clipSegments.map((s) => s.text).join(" ");

      candidates.push({
        episodeId,
        episodeTitle,
        podcastTitle,
        startTime: seg.startTime,
        endTime: seg.endTime,
        score,
        scoreDimensions: dimensions,
        summary: seg.summary ?? "",
        speakers: seg.speakers ?? [],
        text: clipText,
      });
    }

    return candidates;
  } catch (error) {
    console.error(
      `Failed to analyze episode "${episodeTitle}":`,
      error
    );
    return [];
  }
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

  // Process each episode with a single Claude call
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

    console.log(
      `Analyzing episode "${episode.title}" — ${segments.length} transcript segments (single API call)`
    );

    const episodeCandidates = await analyzeEpisodeTranscript(
      episode.id,
      episode.title,
      episode.podcast.title,
      segments,
      analysisConfig
    );

    allCandidates.push(...episodeCandidates);
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
