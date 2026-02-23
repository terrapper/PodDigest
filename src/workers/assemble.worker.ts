import { assembleQueue, deliverQueue } from "@/lib/queue";
import { assembleDigest } from "@/services/audio-assembler";
import { getPublicUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { NarrateJobResult, AssembleJobResult } from "@/types";

assembleQueue.process(async (job) => {
  const { digestId, narrationAudios } = job.data as NarrateJobResult;
  console.log(`[assemble-worker] Starting assembly for digest ${digestId}`);

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "ASSEMBLING" },
  });

  try {
    const { s3Key, totalDuration, chapters } = await assembleDigest(
      digestId,
      narrationAudios
    );

    console.log(
      `[assemble-worker] Assembly complete for digest ${digestId}: ${Math.round(totalDuration / 60)}min, ${chapters.length} chapters`
    );

    // Update digest with audio information
    const audioUrl = getPublicUrl(s3Key);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        audioUrl,
        totalDuration,
        chapters: chapters as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    job.progress(100);

    const result: AssembleJobResult = {
      digestId,
      audioS3Key: s3Key,
      totalDuration,
      chapters,
    };

    // Queue the final pipeline step: delivery
    await deliverQueue.add({ digestId }, {
      jobId: `deliver-${digestId}`,
    });

    return result;
  } catch (error) {
    console.error(`[assemble-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Assembly failed",
      },
    });
    throw error;
  }
});

console.log("[assemble-worker] Worker registered and listening");
