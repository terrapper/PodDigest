import { transcribeQueue, analyzeQueue } from "@/lib/queue";
import { transcribeEpisode } from "@/services/transcription";
import { prisma } from "@/lib/prisma";
import type { CrawlJobResult, TranscribeJobResult } from "@/types";

transcribeQueue.process(async (job) => {
  const { digestId, episodeIds } = job.data as CrawlJobResult;
  console.log(
    `[transcribe-worker] Starting transcription for digest ${digestId} (${episodeIds.length} episodes)`
  );

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "TRANSCRIBING" },
  });

  try {
    const transcribedEpisodeIds: string[] = [];

    for (let i = 0; i < episodeIds.length; i++) {
      const episodeId = episodeIds[i];

      // Check if transcript already exists
      const existing = await prisma.transcript.findUnique({
        where: { episodeId },
      });
      if (existing && existing.status === "COMPLETED") {
        console.log(
          `[transcribe-worker] Transcript already exists for episode ${episodeId}, skipping`
        );
        transcribedEpisodeIds.push(episodeId);
        job.progress(Math.round((100 * (i + 1)) / episodeIds.length));
        continue;
      }

      try {
        const s3Key = `episodes/${episodeId}/audio.mp3`;
        const result = await transcribeEpisode(episodeId, s3Key);
        console.log(
          `[transcribe-worker] Transcribed episode ${episodeId}: ${result.segmentCount} segments`
        );
        transcribedEpisodeIds.push(episodeId);
      } catch (err) {
        console.error(
          `[transcribe-worker] Failed to transcribe episode ${episodeId}:`,
          err
        );
        // Continue with remaining episodes — partial transcription is OK
      }

      job.progress(Math.round((100 * (i + 1)) / episodeIds.length));
    }

    if (transcribedEpisodeIds.length === 0) {
      throw new Error("No episodes were successfully transcribed");
    }

    console.log(
      `[transcribe-worker] Transcribed ${transcribedEpisodeIds.length}/${episodeIds.length} episodes`
    );

    const result: TranscribeJobResult = {
      digestId,
      episodeIds: transcribedEpisodeIds,
    };

    // Queue the next pipeline step: analysis
    await analyzeQueue.add(result, {
      jobId: `analyze-${digestId}`,
    });

    console.log(`[transcribe-worker] Transcription complete for digest ${digestId}`);
    return result;
  } catch (error) {
    console.error(`[transcribe-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Transcription failed",
      },
    });
    throw error;
  }
});

console.log("[transcribe-worker] Worker registered and listening");
