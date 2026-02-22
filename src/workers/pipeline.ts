// Main Digest Pipeline Orchestrator
// Coordinates the 7-step process:
// 1. Feed Crawler → 2. Audio Downloader → 3. Transcription →
// 4. AI Analysis → 5. Narration → 6. Audio Assembly → 7. Delivery
//
// Each step is a Bull queue worker that chains to the next.
// This orchestrator triggers the pipeline and manages scheduling.

import {
  pipelineQueue,
  crawlQueue,
  allQueues,
  closeAllQueues,
} from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import type { PipelineJobData } from "@/types";

// ─── Pipeline Trigger ──────────────────────────────────────────

export async function triggerDigestPipeline(
  userId: string,
  configId: string
): Promise<string> {
  const config = await prisma.digestConfig.findUniqueOrThrow({
    where: { id: configId },
  });

  if (config.userId !== userId) {
    throw new Error("Config does not belong to user");
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const digest = await prisma.digest.create({
    data: {
      userId,
      configId,
      title: `Weekly Digest — ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      weekStart,
      weekEnd: now,
      status: "PENDING",
    },
  });

  console.log(`[pipeline] Created digest ${digest.id} for user ${userId}`);

  const jobData: PipelineJobData = {
    digestId: digest.id,
    userId,
    configId,
  };

  // Kick off the pipeline by queuing the first step: crawl
  await crawlQueue.add(jobData, {
    jobId: `crawl-${digest.id}`,
  });

  console.log(`[pipeline] Queued crawl job for digest ${digest.id}`);
  return digest.id;
}

// ─── Scheduled Pipeline ────────────────────────────────────────

export async function scheduleWeeklyDigests(): Promise<void> {
  // Process the pipeline queue: checks which users have digests due
  pipelineQueue.process(async (job) => {
    console.log("[pipeline] Running scheduled digest check");

    const activeConfigs = await prisma.digestConfig.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true } } },
    });

    console.log(
      `[pipeline] Found ${activeConfigs.length} active digest configs`
    );

    const triggered: string[] = [];

    for (const config of activeConfigs) {
      // Check if a digest is already in progress for this config
      const inProgress = await prisma.digest.findFirst({
        where: {
          configId: config.id,
          status: {
            notIn: ["COMPLETED", "FAILED"],
          },
        },
      });

      if (inProgress) {
        console.log(
          `[pipeline] Digest already in progress for config ${config.id}, skipping`
        );
        continue;
      }

      // Check if it's the right day/time for this config
      if (!isDeliveryDue(config.deliveryDay, config.deliveryTime)) {
        continue;
      }

      try {
        const digestId = await triggerDigestPipeline(
          config.user.id,
          config.id
        );
        triggered.push(digestId);
        console.log(
          `[pipeline] Triggered digest ${digestId} for config ${config.id}`
        );
      } catch (err) {
        console.error(
          `[pipeline] Failed to trigger digest for config ${config.id}:`,
          err
        );
      }
    }

    return { triggered, total: activeConfigs.length };
  });

  // Schedule the pipeline check to run every hour using Bull's repeat
  await pipelineQueue.add(
    {},
    {
      repeat: { cron: "0 * * * *" }, // Every hour on the hour
      jobId: "scheduled-digest-check",
    }
  );

  console.log("[pipeline] Scheduled hourly digest check (cron: 0 * * * *)");
}

// ─── Delivery Time Check ───────────────────────────────────────

function isDeliveryDue(deliveryDay: string, deliveryTime: string): boolean {
  const now = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDay = dayNames[now.getUTCDay()];

  if (currentDay !== deliveryDay.toLowerCase()) {
    return false;
  }

  // Parse delivery time (e.g., "08:00")
  const [hours] = deliveryTime.split(":").map(Number);
  const currentHour = now.getUTCHours();

  // Trigger if we're within the delivery hour (checked hourly)
  return currentHour === hours;
}

// ─── Pipeline Status ───────────────────────────────────────────

export async function getPipelineStatus(digestId: string) {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
    include: {
      clips: { orderBy: { position: "asc" } },
      config: true,
    },
  });

  // Check job status in each queue
  const queueStatuses = await Promise.all(
    [
      { name: "crawl", queue: crawlQueue },
    ].map(async ({ name, queue }) => {
      const job = await queue.getJob(`${name}-${digestId}`);
      return {
        step: name,
        status: job ? await job.getState() : null,
        progress: job ? job.progress() : null,
      };
    })
  );

  return {
    digestId,
    status: digest.status,
    error: digest.error,
    clipCount: digest.clipCount,
    totalDuration: digest.totalDuration,
    audioUrl: digest.audioUrl,
    steps: queueStatuses,
  };
}

// ─── Worker Registration ───────────────────────────────────────

export async function startAllWorkers(): Promise<void> {
  // Import all workers to register their queue processors
  await import("./crawl.worker");
  await import("./transcribe.worker");
  await import("./analyze.worker");
  await import("./narrate.worker");
  await import("./assemble.worker");
  await import("./deliver.worker");

  // Start the scheduled pipeline
  await scheduleWeeklyDigests();

  console.log("[pipeline] All workers started and pipeline scheduled");
}

export async function stopAllWorkers(): Promise<void> {
  await closeAllQueues();
  console.log("[pipeline] All workers stopped");
}

// ─── Cleanup Utilities ─────────────────────────────────────────

export async function retryFailedDigest(digestId: string): Promise<void> {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
  });

  if (digest.status !== "FAILED") {
    throw new Error(`Digest ${digestId} is not in FAILED state`);
  }

  // Reset status and re-trigger
  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "PENDING", error: null },
  });

  const jobData: PipelineJobData = {
    digestId,
    userId: digest.userId,
    configId: digest.configId,
  };

  await crawlQueue.add(jobData, {
    jobId: `crawl-retry-${digestId}-${Date.now()}`,
  });

  console.log(`[pipeline] Retrying failed digest ${digestId}`);
}

export async function cancelDigest(digestId: string): Promise<void> {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
  });

  if (digest.status === "COMPLETED" || digest.status === "FAILED") {
    throw new Error(`Cannot cancel digest in ${digest.status} state`);
  }

  // Remove pending jobs from all queues
  for (const queue of allQueues) {
    const jobId = `${queue.name.replace("poddigest:", "")}-${digestId}`;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "FAILED", error: "Cancelled by user" },
  });

  console.log(`[pipeline] Cancelled digest ${digestId}`);
}
