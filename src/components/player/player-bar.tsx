"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  List,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerContext } from "./player-provider";
import { ChapterList } from "./chapter-list";

/** Available playback speed options */
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

/** Format seconds into MM:SS display string */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    state,
    togglePlay,
    seek,
    setVolume,
    setPlaybackRate,
    seekToChapter,
    skipForward,
    skipBackward,
    chapters,
    digestTitle,
    digestArtwork,
  } = usePlayerContext();

  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(state.volume);

  const currentChapter = chapters[state.currentChapterIndex];
  const hasContent = chapters.length > 0;

  // Compute chapter boundary tick positions as percentages of total duration.
  // Skip the first chapter (0%) since that is the start of the track.
  const chapterTicks = useMemo(() => {
    if (state.duration === 0 || chapters.length <= 1) return [];
    return chapters.slice(1).map((ch) => (ch.startTime / state.duration) * 100);
  }, [chapters, state.duration]);

  // Cycle to the next playback rate in the list
  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(state.playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  };

  // Mute / unmute toggle preserving the volume level before mute
  const toggleMute = () => {
    if (isMuted) {
      setVolume(volumeBeforeMute);
      setIsMuted(false);
    } else {
      setVolumeBeforeMute(state.volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Previous chapter: if >3s into current chapter, restart it; otherwise go to previous
  const handlePreviousChapter = () => {
    if (currentChapter && state.currentTime - currentChapter.startTime > 3) {
      seekToChapter(state.currentChapterIndex);
    } else if (state.currentChapterIndex > 0) {
      seekToChapter(state.currentChapterIndex - 1);
    } else {
      seek(0);
    }
  };

  // Next chapter
  const handleNextChapter = () => {
    if (state.currentChapterIndex < chapters.length - 1) {
      seekToChapter(state.currentChapterIndex + 1);
    }
  };

  // Format playback rate label for display
  const rateLabel =
    state.playbackRate === 1
      ? "1x"
      : state.playbackRate % 1 === 0
        ? `${state.playbackRate}x`
        : `${state.playbackRate}x`;

  // Do not render if no digest is loaded
  if (!hasContent) return null;

  return (
    <>
      {/* Chapter list slide-up panel */}
      <ChapterList
        chapters={chapters}
        currentChapterIndex={state.currentChapterIndex}
        currentTime={state.currentTime}
        onSeekToChapter={(index) => {
          seekToChapter(index);
          setIsChapterListOpen(false);
        }}
        isOpen={isChapterListOpen}
      />

      {/* Sticky bottom player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-card/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
          {/* ── Progress bar with chapter boundary ticks ── */}
          <div className="relative px-4">
            <div className="relative group">
              <Slider
                value={[state.currentTime]}
                max={state.duration || 100}
                step={0.1}
                onValueChange={([value]) => seek(value)}
                className="h-6 -mt-3 cursor-pointer"
              />
              {/* Chapter boundary tick dots overlaid on the slider track */}
              {chapterTicks.map((position, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-foreground/40 pointer-events-none z-10"
                  style={{ left: `${position}%` }}
                />
              ))}
            </div>
          </div>

          {/* ── Main three-column controls layout ── */}
          <div className="flex items-center gap-4 px-4 pb-3 pt-1">
            {/* ── Left column: Album art + track info ── */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* 48x48 rounded album art thumbnail */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {digestArtwork ? (
                  <Image
                    src={digestArtwork}
                    alt={digestTitle}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center gradient-primary">
                    <List className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>

              {/* Current chapter title and digest/podcast name */}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {currentChapter?.title || digestTitle}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {digestTitle}
                </p>
              </div>
            </div>

            {/* ── Center column: Transport controls ── */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                {/* Skip back 15 seconds */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => skipBackward(15)}
                  aria-label="Skip back 15 seconds"
                >
                  <div className="relative">
                    <SkipBack className="h-4 w-4" />
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold">
                      15
                    </span>
                  </div>
                </Button>

                {/* Previous chapter */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handlePreviousChapter}
                  aria-label="Previous chapter"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </Button>

                {/* Play / Pause - gradient circle button */}
                <button
                  onClick={togglePlay}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full gradient-primary",
                    "text-white shadow-lg shadow-primary/25",
                    "transition-transform duration-150 hover:scale-105 active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                  aria-label={state.isPlaying ? "Pause" : "Play"}
                >
                  {state.isPlaying ? (
                    <Pause className="h-5 w-5 fill-white" />
                  ) : (
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                  )}
                </button>

                {/* Next chapter */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleNextChapter}
                  disabled={state.currentChapterIndex >= chapters.length - 1}
                  aria-label="Next chapter"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </Button>

                {/* Skip forward 15 seconds */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => skipForward(15)}
                  aria-label="Skip forward 15 seconds"
                >
                  <div className="relative">
                    <SkipForward className="h-4 w-4" />
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold">
                      15
                    </span>
                  </div>
                </Button>
              </div>

              {/* Current time / total duration display */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                <span>{formatTime(state.currentTime)}</span>
                <span>/</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>

            {/* ── Right column: Volume, speed, chapter list toggle ── */}
            <div className="flex items-center justify-end gap-2 flex-1">
              {/* Volume control (hidden on very small screens) */}
              <div className="hidden sm:flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || state.volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[state.volume]}
                  max={1}
                  step={0.01}
                  onValueChange={([value]) => {
                    setVolume(value);
                    if (value > 0) setIsMuted(false);
                  }}
                  className="w-20"
                />
              </div>

              {/* Playback speed cycle button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                onClick={cyclePlaybackRate}
                aria-label={`Playback speed ${rateLabel}`}
              >
                <Clock className="mr-1 h-3 w-3" />
                {rateLabel}
              </Button>

              {/* Chapter list toggle button */}
              <Button
                variant={isChapterListOpen ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "h-8 w-8 transition-colors",
                  isChapterListOpen
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setIsChapterListOpen(!isChapterListOpen)}
                aria-label={
                  isChapterListOpen ? "Close chapter list" : "Open chapter list"
                }
              >
                {isChapterListOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
