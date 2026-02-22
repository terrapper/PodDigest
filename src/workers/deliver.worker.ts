import { deliverQueue } from "@/lib/queue";
import { deliverDigest } from "@/services/delivery";
import { prisma } from "@/lib/prisma";

interface DeliverJobData {
  digestId: string;
}

deliverQueue.process(async (job) => {
  const { digestId } = job.data as DeliverJobData;
  console.log(`[deliver-worker] Starting delivery for digest ${digestId}`);

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "DELIVERING" },
  });

  try {
    await deliverDigest(digestId);

    console.log(`[deliver-worker] Delivery complete for digest ${digestId}`);
    job.progress(100);

    return { digestId, status: "delivered" };
  } catch (error) {
    console.error(`[deliver-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Delivery failed",
      },
    });
    throw error;
  }
});

console.log("[deliver-worker] Worker registered and listening");
