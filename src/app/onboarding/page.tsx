"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Headphones, Search, Settings, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { PodcastSearchResult } from "@/types";

const steps = [
  { id: 1, title: "Find Podcasts", icon: Search },
  { id: 2, title: "Set Preferences", icon: Settings },
  { id: 3, title: "Get Your Digest", icon: Headphones },
];

const suggestedPodcasts = [
  { name: "Lex Fridman Podcast", genre: "Technology" },
  { name: "Huberman Lab", genre: "Science" },
  { name: "All-In Podcast", genre: "Business" },
  { name: "How I Built This", genre: "Entrepreneurship" },
  { name: "Radiolab", genre: "Science" },
  { name: "The Tim Ferriss Show", genre: "Lifestyle" },
  { name: "My First Million", genre: "Business" },
  { name: "Acquired", genre: "Technology" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  // Store full search result objects keyed by trackName for subscription
  const [selectedPodcasts, setSelectedPodcasts] = useState<Map<string, PodcastSearchResult>>(new Map());
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchPodcasts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/podcasts/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPodcasts(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchPodcasts]);

  const toggleSearchResult = (podcast: PodcastSearchResult) => {
    setSelectedPodcasts((prev) => {
      const next = new Map(prev);
      if (next.has(podcast.trackName)) {
        next.delete(podcast.trackName);
      } else {
        next.set(podcast.trackName, podcast);
      }
      return next;
    });
  };

  const handleSuggestedClick = (name: string) => {
    setSearchQuery(name);
  };

  const handleContinueFromStep1 = async () => {
    if (selectedPodcasts.size === 0) return;
    setIsSubscribing(true);
    try {
      const promises = Array.from(selectedPodcasts.values()).map((podcast) =>
        fetch("/api/podcasts/subscribe", {
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
        }),
      );
      await Promise.allSettled(promises);
    } catch {
      // Continue anyway — partial success is fine
    } finally {
      setIsSubscribing(false);
      setCurrentStep(2);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
          <Headphones className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold gradient-primary-text">
          PodDigest AI
        </span>
      </div>

      {/* Steps indicator */}
      <div className="mb-10 flex items-center gap-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step.id <= currentStep
                    ? "gradient-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`text-sm ${
                  step.id <= currentStep
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-12 ${
                  step.id < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  What podcasts do you listen to?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Select some podcasts to get started, or search for your favorites.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search for podcasts..."
                  className="bg-background pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
              {searchQuery.trim() && searchResults.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    Search Results
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults.slice(0, 8).map((podcast) => (
                      <button
                        key={podcast.trackId}
                        onClick={() => toggleSearchResult(podcast)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                          selectedPodcasts.has(podcast.trackName)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            selectedPodcasts.has(podcast.trackName)
                              ? "gradient-primary"
                              : "bg-muted"
                          }`}
                        >
                          <Headphones
                            className={`h-5 w-5 ${
                              selectedPodcasts.has(podcast.trackName)
                                ? "text-white"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {podcast.trackName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {podcast.artistName}
                          </p>
                        </div>
                        {selectedPodcasts.has(podcast.trackName) && (
                          <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No podcasts found. Try a different search term.
                </p>
              )}

              {/* Suggested podcasts (show when not searching) — click to search */}
              {!searchQuery.trim() && (
                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    Popular Podcasts — click to search
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPodcasts.map((podcast) => (
                      <button
                        key={podcast.name}
                        onClick={() => handleSuggestedClick(podcast.name)}
                        className="rounded-full border border-border px-4 py-2 text-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                      >
                        {podcast.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected count */}
              {selectedPodcasts.size > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {selectedPodcasts.size} podcast{selectedPodcasts.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold">
                Set your preferences
              </h2>
              <p className="text-muted-foreground">
                You can customize these anytime in the Configure section.
              </p>
              <div className="space-y-4 text-left">
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Digest Length</p>
                  <p className="text-sm text-muted-foreground">60 minutes (recommended)</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Delivery Schedule</p>
                  <p className="text-sm text-muted-foreground">Every Friday at 8:00 AM</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Narrator Voice</p>
                  <p className="text-sm text-muted-foreground">Alex — Warm and articulate</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground">
                We&apos;ll start analyzing your podcast episodes and have your first
                digest ready soon.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-between">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep === 1 ? (
              <Button
                variant="gradient"
                onClick={handleContinueFromStep1}
                disabled={selectedPodcasts.size === 0 || isSubscribing}
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : currentStep === 2 ? (
              <Button
                variant="gradient"
                onClick={() => setCurrentStep(3)}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button variant="gradient">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
