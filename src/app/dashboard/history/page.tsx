"use client";

import { Play, Clock, Headphones, Calendar, Download, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pastDigests = [
  {
    id: "1",
    title: "Weekly Tech & Culture Digest",
    weekRange: "Feb 15 – Feb 21, 2026",
    duration: "58 min",
    clipCount: 12,
    status: "COMPLETED" as const,
    podcasts: ["Lex Fridman", "Huberman Lab", "All-In Podcast"],
  },
  {
    id: "2",
    title: "Startup & Business Roundup",
    weekRange: "Feb 8 – Feb 14, 2026",
    duration: "45 min",
    clipCount: 9,
    status: "COMPLETED" as const,
    podcasts: ["How I Built This", "My First Million", "The Tim Ferriss Show"],
  },
  {
    id: "3",
    title: "Science & Health Weekly",
    weekRange: "Feb 1 – Feb 7, 2026",
    duration: "62 min",
    clipCount: 14,
    status: "COMPLETED" as const,
    podcasts: ["Huberman Lab", "Radiolab", "Science Vs"],
  },
  {
    id: "4",
    title: "Weekly Tech & Culture Digest",
    weekRange: "Jan 25 – Jan 31, 2026",
    duration: "55 min",
    clipCount: 11,
    status: "COMPLETED" as const,
    podcasts: ["Lex Fridman", "Huberman Lab", "The Vergecast"],
  },
  {
    id: "5",
    title: "Startup & Business Roundup",
    weekRange: "Jan 18 – Jan 24, 2026",
    duration: "48 min",
    clipCount: 10,
    status: "COMPLETED" as const,
    podcasts: ["How I Built This", "Acquired", "My First Million"],
  },
];

export default function HistoryPage() {
  const { toast } = useToast();

  const handlePlay = (digest: (typeof pastDigests)[0]) => {
    toast({
      title: "No audio available",
      description: `"${digest.title}" hasn't been generated yet. Subscribe to podcasts and generate your first digest.`,
    });
  };

  const handleDownload = (digest: (typeof pastDigests)[0]) => {
    toast({
      title: "Download unavailable",
      description: `"${digest.title}" hasn't been generated yet. Audio will be downloadable once your digest pipeline runs.`,
    });
  };

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

      <div className="space-y-3">
        {pastDigests.map((digest) => (
          <Card
            key={digest.id}
            className="group cursor-pointer transition-all hover:border-primary/30"
            onClick={() => handlePlay(digest)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              {/* Play button */}
              <button
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-primary opacity-90 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(digest);
                }}
              >
                <Play className="h-5 w-5 text-white ml-0.5" />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{digest.title}</h3>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {digest.weekRange}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {digest.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Headphones className="h-3.5 w-3.5" />
                    {digest.clipCount} clips
                  </span>
                </div>
              </div>

              {/* Podcasts */}
              <div className="hidden lg:flex items-center gap-1">
                {digest.podcasts.slice(0, 2).map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {name}
                  </Badge>
                ))}
                {digest.podcasts.length > 2 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{digest.podcasts.length - 2}
                  </Badge>
                )}
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
                  <DropdownMenuItem onClick={() => handlePlay(digest)}>
                    <Play className="mr-2 h-4 w-4" />
                    Play
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(digest)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download MP3
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
