// ─── iTunes API Types ──────────────────────────────────────────

export interface PodcastSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  artworkUrl600: string;
  feedUrl: string;
  primaryGenreName: string;
  genres: string[];
  trackCount: number;
  releaseDate: string;
  collectionName: string;
}

export interface ITunesSearchResponse {
  resultCount: number;
  results: PodcastSearchResult[];
}

// ─── Audio Player Types ────────────────────────────────────────

export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentChapterIndex: number;
}

// ─── Transcript Types ──────────────────────────────────────────

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker?: string;
  text: string;
}

// ─── Scoring Types ─────────────────────────────────────────────

export interface ScoreDimensions {
  insightDensity: number;      // 0-100, weight 25%
  emotionalIntensity: number;  // 0-100, weight 20%
  actionability: number;       // 0-100, weight 20%
  topicalRelevance: number;    // 0-100, weight 20%
  conversationalQuality: number; // 0-100, weight 15%
}

// ─── Voice & Narration Types ───────────────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  provider: "elevenlabs";
  previewUrl?: string;
  gender?: "male" | "female" | "neutral";
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "narrator-1", name: "Alex", description: "Warm and articulate", provider: "elevenlabs", gender: "male" },
  { id: "narrator-2", name: "Morgan", description: "Engaging and dynamic", provider: "elevenlabs", gender: "neutral" },
  { id: "narrator-3", name: "Sarah", description: "Clear and conversational", provider: "elevenlabs", gender: "female" },
  { id: "narrator-4", name: "James", description: "Deep and authoritative", provider: "elevenlabs", gender: "male" },
  { id: "narrator-5", name: "Luna", description: "Friendly and upbeat", provider: "elevenlabs", gender: "female" },
  { id: "narrator-6", name: "River", description: "Calm and refined", provider: "elevenlabs", gender: "neutral" },
];

// ─── Configuration Constants ───────────────────────────────────

export const TARGET_LENGTHS = [
  { value: 30, label: "30 min", description: "Quick catch-up" },
  { value: 60, label: "60 min", description: "Standard digest" },
  { value: 90, label: "90 min", description: "Extended listening" },
  { value: 120, label: "2 hours", description: "Deep immersion" },
];

export const CLIP_LENGTH_OPTIONS = {
  SHORT: { label: "Short", description: "2-4 min clips" },
  MEDIUM: { label: "Medium", description: "4-8 min clips" },
  LONG: { label: "Long", description: "8-15 min clips" },
  MIXED: { label: "Mixed", description: "Varied lengths" },
};

export const STRUCTURE_OPTIONS = {
  BY_SCORE: { label: "By Score", description: "Best clips first" },
  BY_SHOW: { label: "By Show", description: "Grouped by podcast" },
  BY_TOPIC: { label: "By Topic", description: "Grouped by theme" },
  CHRONOLOGICAL: { label: "Chronological", description: "Most recent first" },
};

export const NARRATION_DEPTH_OPTIONS = {
  BRIEF: { label: "Brief", description: "Minimal narrator — just names and transitions" },
  STANDARD: { label: "Standard", description: "Context and smooth transitions" },
  DETAILED: { label: "Detailed", description: "Deep context, analysis, and connections" },
};

export const MUSIC_OPTIONS = {
  LOFI: { label: "Lo-fi", description: "Chill beats" },
  AMBIENT: { label: "Ambient", description: "Atmospheric" },
  ACOUSTIC: { label: "Acoustic", description: "Gentle guitar" },
  UPBEAT: { label: "Upbeat", description: "Energetic" },
  NONE: { label: "None", description: "No music" },
};

export const TRANSITION_OPTIONS = {
  STINGER: { label: "Stinger", description: "Quick musical hit" },
  SOFT_FADE: { label: "Soft Fade", description: "Smooth crossfade" },
  WHOOSH: { label: "Whoosh", description: "Swoosh effect" },
  SILENCE: { label: "Silence", description: "Brief pause" },
};

export const DELIVERY_DAYS = [
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
];

export const DELIVERY_TIMES = [
  { value: "06:00", label: "6:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "12:00", label: "Noon" },
  { value: "18:00", label: "6:00 PM" },
];

export const DELIVERY_METHODS = {
  PRIVATE_RSS: { label: "Private RSS", description: "Add to your podcast app" },
  PUSH: { label: "Push", description: "Browser notification" },
  EMAIL: { label: "Email", description: "Link in your inbox" },
  IN_APP: { label: "In-App", description: "Listen on PodDigest" },
};
