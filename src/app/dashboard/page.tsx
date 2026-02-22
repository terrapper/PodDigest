"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Clock,
  Headphones,
  TrendingUp,
  Zap,
  ChevronRight,
  Podcast,
  Loader2,
  Plus,
  Library,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { usePlayerContext } from "@/components/player/player-provider";

interface DigestSummary {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  audioUrl: string | null;
  totalDuration: number;
  clipCount: number;
  status: string;
  createdAt: string;
}

interface Config {
  id: string;
}

const STATUS_PROGRESS: Record<string, { progress: number; label: string }> = {
  PENDING: { progress: 5, label: "Queued for processing..." },
  CRAWLING: { progress: 15, label: "Fetching new episodes..." },
  DOWNLOADING: { progress: 25, label: "Downloading audio..." },
  TRANSCRIBING: { progress: 40, label: "Transcribing episodes..." },
  ANALYZING: { progress: 55, label: "AI analyzing content..." },
  NARRATING: { progress: 70, label: "Generating narration..." },
  ASSEMBLING: { progress: 85, label: "Assembling final audio..." },
  DELIVERING: { progress: 95, label: "Preparing delivery..." },
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { loadDigest } = usePlayerContext();

  useEffect(() => {
    async function fetchData() {
      try {
        const [digestsRes, subsRes, configRes] = await Promise.all([
          fetch("/api/digests?limit=3"),
          fetch("/api/podcasts/subscriptions"),
          fetch("/api/config"),
        ]);

        if (digestsRes.ok) {
          const data = await digestsRes.json();
          setDigests(data.digests ?? []);
        }
        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubscriptionCount(data.subscriptions?.length ?? 0);
        }
        if (configRes.ok) {
          const data = await configRes.json();
          setConfig(data.config ?? null);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const processingDigest = digests.find(
    (d) => d.status !== "COMPLETED" && d.status !== "FAILED",
  );

  const completedDigests = digests.filter((d) => d.status === "COMPLETED");

  const totalClips = completedDigests.reduce((sum, d) => sum + d.clipCount, 0);

  const handleGenerate = async () => {
    if (!config?.id) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: config.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDigests((prev) => [data.digest, ...prev]);
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = async (digestId: string) => {
    try {
      const res = await fetch(`/api/digests/${digestId}`);
      if (!res.ok) return;
      const data = await res.json();
      const digest = data.digest;
      if (digest.audioUrl) {
        const chapters = (digest.clips ?? []).map(
          (clip: { episode: { podcast: { title: string }; title: string }; startTime: number; endTime: number }, i: number) => ({
            title: `${clip.episode.podcast.title}: ${clip.episode.title}`,
            startTime: clip.startTime,
            endTime: clip.endTime,
          }),
        );
        loadDigest({
          src: digest.audioUrl,
          chapters,
          title: digest.title,
          artwork: "",
        });
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasContent = digests.length > 0 || subscriptionCount > 0;

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">
            {hasContent
              ? "Here's what's happening with your podcasts."
              : "Get started by subscribing to some podcasts."}
          </p>
        </div>
        {config && !processingDigest && subscriptionCount > 0 && (
          <Button
            variant="gradient"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Generate New Digest
          </Button>
        )}
      </div>

      {/* Empty state for brand new users */}
      {!hasContent && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Podcast className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No podcasts yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Subscribe to your favorite podcasts, then generate your first
              AI-powered digest with the best clips stitched together.
            </p>
            <Link href="/dashboard/library" className="mt-6">
              <Button variant="gradient">
                <Library className="mr-2 h-4 w-4" />
                Browse Podcasts
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Processing status */}
      {processingDigest && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">
                  {processingDigest.title}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary"
                >
                  {processingDigest.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {STATUS_PROGRESS[processingDigest.status]?.label ??
                  "Processing..."}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <Progress
                  value={
                    STATUS_PROGRESS[processingDigest.status]?.progress ?? 10
                  }
                  className="h-2 flex-1"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {STATUS_PROGRESS[processingDigest.status]?.progress ?? 10}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      {hasContent && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedDigests.length}</p>
                <p className="text-xs text-muted-foreground">
                  Digests Generated
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Podcast className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subscriptionCount}</p>
                <p className="text-xs text-muted-foreground">
                  Podcasts Tracked
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClips}</p>
                <p className="text-xs text-muted-foreground">
                  Total Clips
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent digests */}
      {completedDigests.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Digests</h2>
            <Link href="/dashboard/history">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedDigests.map((digest) => (
              <Card
                key={digest.id}
                className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                onClick={() => handlePlay(digest.id)}
              >
                <CardContent className="p-5">
                  {/* Gradient header */}
                  <div className="mb-4 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-primary/60 to-accent/60 opacity-80">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
                      <Play className="h-6 w-6 text-white ml-0.5" />
                    </div>
                  </div>

                  <h3 className="font-semibold line-clamp-1">
                    {digest.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(digest.createdAt)}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(digest.totalDuration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Headphones className="h-3 w-3" />
                      {digest.clipCount} clips
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
