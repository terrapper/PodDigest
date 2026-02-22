"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Chapter, PlayerState } from "@/types";

export function usePlayer(chapters: Chapter[] = []) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1,
    currentChapterIndex: 0,
  });

  const play = useCallback(() => {
    audioRef.current?.play();
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setState((prev) => ({ ...prev, volume }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const seekToChapter = useCallback(
    (index: number) => {
      if (chapters[index]) {
        seek(chapters[index].startTime);
        setState((prev) => ({ ...prev, currentChapterIndex: index }));
      }
    },
    [chapters, seek]
  );

  const skipForward = useCallback(
    (seconds = 15) => {
      seek(Math.min(state.currentTime + seconds, state.duration));
    },
    [state.currentTime, state.duration, seek]
  );

  const skipBackward = useCallback(
    (seconds = 15) => {
      seek(Math.max(state.currentTime - seconds, 0));
    },
    [state.currentTime, seek]
  );

  useEffect(() => {
    if (chapters.length === 0) return;
    const currentChapter = chapters.findIndex(
      (ch) => state.currentTime >= ch.startTime && state.currentTime < ch.endTime
    );
    if (currentChapter !== -1 && currentChapter !== state.currentChapterIndex) {
      setState((prev) => ({ ...prev, currentChapterIndex: currentChapter }));
    }
  }, [state.currentTime, chapters, state.currentChapterIndex]);

  const setAudioSrc = useCallback(
    (src: string) => {
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
        audioRef.current.volume = state.volume;
        audioRef.current.playbackRate = state.playbackRate;

        audioRef.current.addEventListener("timeupdate", () => {
          setState((prev) => ({
            ...prev,
            currentTime: audioRef.current?.currentTime || 0,
          }));
        });

        audioRef.current.addEventListener("loadedmetadata", () => {
          setState((prev) => ({
            ...prev,
            duration: audioRef.current?.duration || 0,
          }));
        });

        audioRef.current.addEventListener("ended", () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
        });
      } else {
        audioRef.current.src = src;
      }
    },
    [state.volume, state.playbackRate]
  );

  return {
    state,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    setPlaybackRate,
    seekToChapter,
    skipForward,
    skipBackward,
    setAudioSrc,
  };
}
