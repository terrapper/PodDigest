// Feed Crawler & Podcast Discovery Service
// Fetches new episodes from subscribed RSS feeds on schedule
// iTunes Search API integration for podcast discovery

import Parser from "rss-parser";
import type { PodcastSearchResult, ITunesSearchResponse } from "@/types";

const ITUNES_BASE_URL = process.env.ITUNES_API_BASE_URL || "https://itunes.apple.com";

export async function searchPodcasts(query: string): Promise<PodcastSearchResult[]> {
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

const parser = new Parser();

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
