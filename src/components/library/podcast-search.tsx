"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, Loader2, Plus, Check, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PodcastSearchResult } from "@/types";

export function PodcastSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PodcastSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchPodcasts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/podcasts/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPodcasts(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchPodcasts]);

  const [subscribing, setSubscribing] = useState<Set<number>>(new Set());

  const toggleSubscribe = async (podcast: PodcastSearchResult) => {
    if (subscribedIds.has(podcast.trackId)) {
      // Already subscribed — toggle off locally (unsubscribe would need separate API)
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        next.delete(podcast.trackId);
        return next;
      });
      return;
    }

    setSubscribing((prev) => new Set(prev).add(podcast.trackId));
    try {
      const res = await fetch("/api/podcasts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl: podcast.feedUrl,
          itunesId: String(podcast.trackId),
          title: podcast.trackName,
          author: podcast.artistName,
          artworkUrl: podcast.artworkUrl600 || podcast.artworkUrl100,
          category: podcast.primaryGenreName,
          priority: "PREFERRED",
        }),
      });
      if (!res.ok) throw new Error("Subscribe failed");
      setSubscribedIds((prev) => new Set(prev).add(podcast.trackId));
    } catch {
      // Subscription failed — don't update state
    } finally {
      setSubscribing((prev) => {
        const next = new Set(prev);
        next.delete(podcast.trackId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search podcasts by name, topic, or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 bg-card border-border text-base"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Loading Skeletons */}
      {isLoading && results.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((podcast) => (
            <SearchResultCard
              key={podcast.trackId}
              podcast={podcast}
              isSubscribed={subscribedIds.has(podcast.trackId)}
              isSubscribing={subscribing.has(podcast.trackId)}
              onToggleSubscribe={() => toggleSubscribe(podcast)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No podcasts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term or check the spelling
          </p>
        </div>
      )}

      {/* Initial state */}
      {!isLoading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Discover new podcasts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Search the iTunes catalog to find and subscribe to podcasts
          </p>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  podcast,
  isSubscribed,
  isSubscribing,
  onToggleSubscribe,
}: {
  podcast: PodcastSearchResult;
  isSubscribed: boolean;
  isSubscribing: boolean;
  onToggleSubscribe: () => void;
}) {
  return (
    <Card className="group overflow-hidden border-border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex gap-4 p-4">
        {/* Artwork */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={podcast.artworkUrl100}
            alt={podcast.trackName}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="truncate text-sm font-semibold leading-tight">
            {podcast.trackName}
          </h4>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {podcast.artistName}
          </p>
          <Badge
            variant="secondary"
            className="mt-1.5 w-fit text-[10px] px-2 py-0"
          >
            {podcast.primaryGenreName}
          </Badge>
          <div className="mt-auto pt-2">
            <p className="text-[11px] text-muted-foreground">
              {podcast.trackCount} episodes
            </p>
          </div>
        </div>
      </div>

      {/* Subscribe button */}
      <div className="border-t border-border px-4 py-3">
        <Button
          size="sm"
          variant={isSubscribed ? "secondary" : "gradient"}
          className={cn("w-full", isSubscribed && "text-primary")}
          onClick={onToggleSubscribe}
          disabled={isSubscribing}
        >
          {isSubscribing ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Subscribing...
            </>
          ) : isSubscribed ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Subscribed
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Subscribe
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function SearchResultSkeleton() {
  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="flex gap-4 p-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="mt-auto h-3 w-20" />
        </div>
      </div>
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </Card>
  );
}
