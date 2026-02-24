// Feed Crawler & Podcast Discovery Service
// Fetches new episodes from subscribed RSS feeds
// iTunes Search API for podcast discovery

import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import type { PodcastSearchResult, ITunesSearchResponse } from "@/types";

const ITUNES_BASE_URL =
  process.env.ITUNES_API_BASE_URL || "https://itunes.apple.com";

const parser = new Parser();

/**
 * Search for podcasts using the iTunes Search API.
 */
export async function searchPodcasts(
  query: string
): Promise<PodcastSearchResult[]> {
  const params = new URLSearchParams({
    term: query,
    media: "podcast",
    entity: "podcast",
    limit: "20",
  });

  const response = await fetch(`${ITUNES_BASE_URL}/search?${params}`);
  if (!response.ok) {
    throw new Error(`iTunes search failed: ${response.statusText}`);
  }

  const data: ITunesSearchResponse = await response.json();
  return data.results;
}

/**
 * Parse a raw RSS feed URL and return structured feed data.
 */
export async function crawlFeed(feedUrl: string) {
  const feed = await parser.parseURL(feedUrl);
  return {
    title: feed.title,
    description: feed.description,
    items: feed.items.map((item) => ({
      title: item.title || "",
      description: item.contentSnippet || item.content || "",
      audioUrl: item.enclosure?.url || "",
      duration: item.itunes?.duration,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      guid: item.guid || item.link || "",
      season: item.itunes?.season ? parseInt(item.itunes.season) : null,
      episode: item.itunes?.episode ? parseInt(item.itunes.episode) : null,
      imageUrl: item.itunes?.image || null,
    })),
  };
}

/**
 * Parse an iTunes-style duration string into seconds.
 *
 * Accepts formats:
 *   - Pure numeric: "3600" -> 3600
 *   - HH:MM:SS: "01:23:45" -> 5025
 *   - MM:SS: "23:45" -> 1425
 *
 * Returns null if the input is undefined or cannot be parsed.
 */
export function parseDuration(durationStr: string | undefined): number | null {
  if (!durationStr) return null;

  const trimmed = durationStr.trim();
  if (!trimmed) return null;

  // Pure numeric string means it is already in seconds
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Parse HH:MM:SS or MM:SS
  const parts = trimmed.split(":").map(Number);

  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

/**
 * Crawl the RSS feed for a single podcast, upsert any episodes that are newer
 * than the podcast's `lastCrawledAt` timestamp, and update the timestamp.
 *
 * Only episodes with a valid `audioUrl` are persisted.
 *
 * Returns the full Episode records that were newly created or updated.
 */
export async function crawlNewEpisodes(podcastId: string, since?: Date) {
  const podcast = await prisma.podcast.findUniqueOrThrow({
    where: { id: podcastId },
  });

  // Use lastCrawledAt, or the explicit since date, or default to 7 days ago
  const cutoffDate = podcast.lastCrawledAt ?? since ?? new Date(Date.now() - 7 * 86400000);

  console.log(
    `[feed-crawler] Crawling feed for "${podcast.title}" (${podcast.feedUrl})`
  );

  const feed = await crawlFeed(podcast.feedUrl);

  console.log(
    `[feed-crawler] Found ${feed.items.length} total items in feed for "${podcast.title}"`
  );

  const newEpisodes = [];

  for (const item of feed.items) {
    // Skip items that have no audio enclosure
    if (!item.audioUrl) continue;

    // Only process episodes published after the cutoff date
    if (item.publishedAt && item.publishedAt <= cutoffDate) {
      continue;
    }

    // Items without a guid cannot be uniquely identified — skip them
    if (!item.guid) continue;

    const episode = await prisma.episode.upsert({
      where: {
        podcastId_guid: {
          podcastId,
          guid: item.guid,
        },
      },
      update: {
        title: item.title,
        description: item.description,
        audioUrl: item.audioUrl,
        duration: parseDuration(item.duration),
        publishedAt: item.publishedAt,
        season: item.season,
        episode: item.episode,
        imageUrl: item.imageUrl,
      },
      create: {
        podcastId,
        title: item.title,
        description: item.description,
        audioUrl: item.audioUrl,
        duration: parseDuration(item.duration),
        publishedAt: item.publishedAt,
        guid: item.guid,
        season: item.season,
        episode: item.episode,
        imageUrl: item.imageUrl,
      },
    });

    newEpisodes.push(episode);
  }

  // Update the podcast's lastCrawledAt so we can skip these episodes next time
  await prisma.podcast.update({
    where: { id: podcastId },
    data: { lastCrawledAt: new Date() },
  });

  console.log(
    `[feed-crawler] Upserted ${newEpisodes.length} new episode(s) for "${podcast.title}"`
  );

  return newEpisodes;
}

/**
 * Crawl every active subscription for a given user, collecting new episodes
 * from each podcast's RSS feed.
 *
 * If an individual feed fails, the error is logged and crawling continues
 * with the remaining subscriptions.
 *
 * Returns a flat array of all newly discovered episode IDs.
 */
export async function crawlSubscribedFeeds(
  userId: string
): Promise<string[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, isActive: true },
    include: { podcast: true },
  });

  console.log(
    `[feed-crawler] Crawling ${subscriptions.length} subscribed feed(s) for user ${userId}`
  );

  const allNewEpisodeIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      const newEpisodes = await crawlNewEpisodes(sub.podcastId);
      for (const ep of newEpisodes) {
        allNewEpisodeIds.push(ep.id);
      }
    } catch (error) {
      console.error(
        `[feed-crawler] Failed to crawl feed for podcast "${sub.podcast.title}" (${sub.podcastId}):`,
        error
      );
      // Continue crawling other feeds even if one fails
    }
  }

  console.log(
    `[feed-crawler] Finished crawling for user ${userId}: ${allNewEpisodeIds.length} new episode(s) total`
  );

  return allNewEpisodeIds;
}
