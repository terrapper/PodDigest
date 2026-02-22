import { crawlQueue, transcribeQueue } from "@/lib/queue";
import { crawlSubscribedFeeds } from "@/services/feed-crawler";
import { downloadEpisodeAudio } from "@/services/audio-downloader";
import { prisma } from "@/lib/prisma";
import type { PipelineJobData, CrawlJobResult } from "@/types";

crawlQueue.process(async (job) => {
  const { digestId, userId } = job.data as PipelineJobData;
  console.log(`[crawl-worker] Starting crawl for digest ${digestId}`);

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "CRAWLING" },
  });

  try {
    // Crawl all subscribed feeds for new episodes
    const newEpisodeIds = await crawlSubscribedFeeds(userId);
    console.log(
      `[crawl-worker] Found ${newEpisodeIds.length} new episodes for user ${userId}`
    );

    // If no new episodes, check for recent episodes from the past week
    let episodeIds = newEpisodeIds;
    if (episodeIds.length === 0) {
      const digest = await prisma.digest.findUniqueOrThrow({
        where: { id: digestId },
      });
      const weekStart = digest.weekStart || new Date(Date.now() - 7 * 86400000);
      const recentEpisodes = await prisma.episode.findMany({
        where: {
          podcast: {
            subscriptions: { some: { userId, isActive: true } },
          },
          publishedAt: { gte: weekStart },
        },
        select: { id: true },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
      episodeIds = recentEpisodes.map((e) => e.id);
      console.log(
        `[crawl-worker] Using ${episodeIds.length} recent episodes from the past week`
      );
    }

    if (episodeIds.length === 0) {
      throw new Error("No episodes found for digest — nothing to process");
    }

    // Download audio for each new episode
    job.progress(50);
    console.log(`[crawl-worker] Downloading audio for ${episodeIds.length} episodes`);
    for (let i = 0; i < episodeIds.length; i++) {
      try {
        await downloadEpisodeAudio(episodeIds[i]);
        console.log(
          `[crawl-worker] Downloaded ${i + 1}/${episodeIds.length}: ${episodeIds[i]}`
        );
      } catch (err) {
        console.error(
          `[crawl-worker] Failed to download episode ${episodeIds[i]}:`,
          err
        );
        // Continue with remaining episodes
      }
      job.progress(50 + Math.round((50 * (i + 1)) / episodeIds.length));
    }

    const result: CrawlJobResult = { digestId, episodeIds };

    // Queue the next pipeline step: transcription
    await transcribeQueue.add(result, {
      jobId: `transcribe-${digestId}`,
    });

    console.log(`[crawl-worker] Crawl complete for digest ${digestId}`);
    return result;
  } catch (error) {
    console.error(`[crawl-worker] Failed for digest ${digestId}:`, error);
    await prisma.digest.update({
      where: { id: digestId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Crawl failed",
      },
    });
    throw error;
  }
});

console.log("[crawl-worker] Worker registered and listening");
