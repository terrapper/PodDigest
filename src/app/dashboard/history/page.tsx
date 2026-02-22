"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Clock,
  Headphones,
  Calendar,
  Download,
  MoreVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETED: {
    label: "Completed",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  FAILED: {
    label: "Failed",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  PENDING: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-primary/15 text-primary border-primary/30",
    }
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

export default function HistoryPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { loadDigest } = usePlayerContext();

  useEffect(() => {
    async function fetchDigests() {
      setLoading(true);
      try {
        const res = await fetch(`/api/digests?page=${page}&limit=10`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDigests(data.digests ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } catch {
        setDigests([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDigests();
  }, [page]);

  const handlePlay = async (digestId: string) => {
    try {
      const res = await fetch(`/api/digests/${digestId}`);
      if (!res.ok) return;
      const data = await res.json();
      const digest = data.digest;
      if (digest.audioUrl) {
        const chapters = (digest.clips ?? []).map(
          (clip: { episode: { podcast: { title: string }; title: string }; startTime: number; endTime: number }) => ({
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

  const handleDownload = (digest: DigestSummary) => {
    if (digest.audioUrl) {
      window.open(digest.audioUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-primary-text">Digest History</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse and replay your past digests
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="gradient-primary-text">Digest History</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse and replay your past digests
        </p>
      </div>

      {digests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <History className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No digests yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Once you generate your first digest, it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {digests.map((digest) => {
              const statusConfig = getStatusConfig(digest.status);
              const isPlayable =
                digest.status === "COMPLETED" && !!digest.audioUrl;

              return (
                <Card
                  key={digest.id}
                  className={`group transition-all ${isPlayable ? "cursor-pointer hover:border-primary/30" : ""}`}
                  onClick={() => isPlayable && handlePlay(digest.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    {/* Play button */}
                    <button
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-opacity ${
                        isPlayable
                          ? "gradient-primary opacity-90 group-hover:opacity-100"
                          : "bg-muted opacity-50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPlayable) handlePlay(digest.id);
                      }}
                      disabled={!isPlayable}
                    >
                      {digest.status === "FAILED" ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : !isPlayable ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Play className="h-5 w-5 text-white ml-0.5" />
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {digest.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 shrink-0 ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatWeekRange(digest.weekStart, digest.weekEnd)}
                        </span>
                        {digest.totalDuration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(digest.totalDuration)}
                          </span>
                        )}
                        {digest.clipCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Headphones className="h-3.5 w-3.5" />
                            {digest.clipCount} clips
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handlePlay(digest.id)}
                          disabled={!isPlayable}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(digest)}
                          disabled={!digest.audioUrl}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download MP3
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
