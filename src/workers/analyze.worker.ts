import { analyzeQueue, narrateQueue } from "@/lib/queue";
import { analyzeTranscripts } from "@/services/ai-analyst";
import { prisma } from "@/lib/prisma";
import type { TranscribeJobResult, AnalyzeJobResult } from "@/types";

analyzeQueue.process(async (job) => {
  const { digestId, episodeIds } = job.data as TranscribeJobResult;
  console.log(
    `[analyze-worker] Starting analysis for digest ${digestId} (${episodeIds.length} episodes)`
  );

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "ANALYZING" },
  });

  try {
    // Load user preferences for personalized scoring
    const digest = await prisma.digest.findUniqueOrThrow({
      where: { id: digestId },
      include: { user: { select: { preferences: true } } },
    });

    const userPreferences =
      digest.user.preferences &&
      typeof digest.user.preferences === "object" &&
      !Array.isArray(digest.user.preferences)
        ? (digest.user.preferences as Record<string, unknown>)
        : undefined;

    const clipIds = await analyzeTranscripts(
      digestId,
      episodeIds,
      userPreferences
    );

    console.log(
      `[analyze-worker] Analysis complete: ${clipIds.length} clips selected for digest ${digestId}`
    );

    // Update clip count on the digest
    await prisma.digest.update({
      where: { id: digestId },
      data: { clipCount: clipIds.length },
    });

    job.progress(100);

    const result: AnalyzeJobResult = { digestId, clipIds };

    // Queue the next pipeline step: narration
    await narrateQueue.add(result, {
      jobId: `narrate-${digestId}`,
    });

    return result;
  } catch (error) {
    console.error(`[analyze-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Analysis failed",
      },
    });
    throw error;
  }
});

console.log("[analyze-worker] Worker registered and listening");
