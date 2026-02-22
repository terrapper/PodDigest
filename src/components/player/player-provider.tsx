"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { usePlayer } from "@/hooks/use-player";
import type { Chapter, PlayerState } from "@/types";

interface PlayerContextValue {
  /** Current player state (isPlaying, currentTime, duration, volume, playbackRate, currentChapterIndex) */
  state: PlayerState;
  /** Toggle between play and pause */
  togglePlay: () => void;
  /** Seek to an absolute time in seconds */
  seek: (time: number) => void;
  /** Set volume (0 to 1) */
  setVolume: (volume: number) => void;
  /** Set playback rate multiplier */
  setPlaybackRate: (rate: number) => void;
  /** Seek to the start of a chapter by index */
  seekToChapter: (index: number) => void;
  /** Skip forward by a number of seconds (default 15) */
  skipForward: (seconds?: number) => void;
  /** Skip backward by a number of seconds (default 15) */
  skipBackward: (seconds?: number) => void;
  /** Set the audio source URL */
  setAudioSrc: (src: string) => void;
  /** The list of chapters for the currently loaded digest */
  chapters: Chapter[];
  /** Title of the currently loaded digest */
  digestTitle: string;
  /** Artwork URL for the currently loaded digest */
  digestArtwork: string;
  /** Load a new digest with its audio source, chapters, title, and artwork */
  loadDigest: (options: {
    src: string;
    chapters: Chapter[];
    title: string;
    artwork: string;
  }) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [digestTitle, setDigestTitle] = useState("");
  const [digestArtwork, setDigestArtwork] = useState("");

  const player = usePlayer(chapters);
  const { setAudioSrc } = player;

  const loadDigest = useCallback(
    (options: {
      src: string;
      chapters: Chapter[];
      title: string;
      artwork: string;
    }) => {
      setChapters(options.chapters);
      setDigestTitle(options.title);
      setDigestArtwork(options.artwork);
      setAudioSrc(options.src);
    },
    [setAudioSrc]
  );

  return (
    <PlayerContext.Provider
      value={{
        state: player.state,
        togglePlay: player.togglePlay,
        seek: player.seek,
        setVolume: player.setVolume,
        setPlaybackRate: player.setPlaybackRate,
        seekToChapter: player.seekToChapter,
        skipForward: player.skipForward,
        skipBackward: player.skipBackward,
        setAudioSrc: player.setAudioSrc,
        chapters,
        digestTitle,
        digestArtwork,
        loadDigest,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within a PlayerProvider");
  }
  return context;
}
