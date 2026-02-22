"use client";

import React, { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

interface ChapterListProps {
  /** All chapters in the digest */
  chapters: Chapter[];
  /** Index of the currently playing chapter */
  currentChapterIndex: number;
  /** Current playback position in seconds */
  currentTime: number;
  /** Callback when user clicks a chapter to seek to it */
  onSeekToChapter: (index: number) => void;
  /** Whether the panel is open */
  isOpen: boolean;
}

export function ChapterList({
  chapters,
  currentChapterIndex,
  currentTime,
  onSeekToChapter,
  isOpen,
}: ChapterListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  // Auto-scroll to the active chapter when it changes or the panel opens
  useEffect(() => {
    if (isOpen && activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isOpen, currentChapterIndex]);

  return (
    <div
      className={cn(
        "fixed bottom-[88px] left-0 right-0 z-40",
        "transition-all duration-300 ease-out",
        isOpen
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop overlay - dark semi-transparent with blur */}
      <div className="absolute inset-0 -top-[100vh] bg-black/60 backdrop-blur-sm" />

      {/* Chapter panel */}
      <div className="relative mx-auto max-w-3xl px-4 pb-2">
        <div className="rounded-t-xl border border-b-0 border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Chapters
              </h3>
              <span className="text-xs text-muted-foreground">
                {chapters.length} segment{chapters.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Music className="mr-1 h-3 w-3" />
              85% original audio &middot; 15% AI narrator
            </Badge>
          </div>

          {/* Scrollable chapter list */}
          <div ref={listRef} className="max-h-[45vh] overflow-y-auto p-2">
            <ul className="space-y-1">
              {chapters.map((chapter, index) => {
                const isActive = index === currentChapterIndex;
                const isPlayed =
                  index < currentChapterIndex ||
                  (index === currentChapterIndex &&
                    currentTime >= chapter.endTime);
                const duration = chapter.endTime - chapter.startTime;

                return (
                  <li
                    key={index}
                    ref={isActive ? activeRef : undefined}
                  >
                    <button
                      onClick={() => onSeekToChapter(index)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                        "transition-all duration-200",
                        isActive
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-secondary/60",
                        isPlayed && !isActive && "opacity-50"
                      )}
                    >
                      {/* Chapter number badge */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          "transition-colors duration-200",
                          isActive
                            ? "gradient-primary text-white shadow-md shadow-primary/20"
                            : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                        )}
                      >
                        {index + 1}
                      </div>

                      {/* Chapter title and source podcast name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive
                              ? "text-foreground"
                              : "text-foreground/80"
                          )}
                        >
                          {chapter.title}
                        </p>
                        {/* Now playing indicator for the active chapter */}
                        {isActive && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                            <span className="text-xs text-primary font-medium">
                              Now playing
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Duration and start time */}
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(duration)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          starts at {formatTime(chapter.startTime)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
