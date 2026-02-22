import { narrateQueue, assembleQueue } from "@/lib/queue";
import { generateAndSynthesizeNarration } from "@/services/narration";
import { prisma } from "@/lib/prisma";
import type { AnalyzeJobResult, NarrateJobResult } from "@/types";

narrateQueue.process(async (job) => {
  const { digestId } = job.data as AnalyzeJobResult;
  console.log(`[narrate-worker] Starting narration for digest ${digestId}`);

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "NARRATING" },
  });

  try {
    const narrationAudios = await generateAndSynthesizeNarration(digestId);

    console.log(
      `[narrate-worker] Generated ${narrationAudios.length} narration segments for digest ${digestId}`
    );

    job.progress(100);

    const result: NarrateJobResult = { digestId, narrationAudios };

    // Queue the next pipeline step: assembly
    await assembleQueue.add(result, {
      jobId: `assemble-${digestId}`,
    });

    return result;
  } catch (error) {
    console.error(`[narrate-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Narration failed",
      },
    });
    throw error;
  }
});

console.log("[narrate-worker] Worker registered and listening");
