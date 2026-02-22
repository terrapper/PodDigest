import { z } from "zod";

export const podcastSearchSchema = z.object({
  query: z.string().min(1).max(200),
});

export const subscribeSchema = z.object({
  feedUrl: z.string().url(),
  itunesId: z.string().optional(),
  title: z.string(),
  author: z.string().optional(),
  artworkUrl: z.string().url().optional(),
  category: z.string().optional(),
  priority: z.enum(["MUST", "PREFERRED", "NICE"]).default("PREFERRED"),
});

export const updateSubscriptionSchema = z.object({
  priority: z.enum(["MUST", "PREFERRED", "NICE"]),
});

export const digestConfigSchema = z.object({
  name: z.string().min(1).max(100),
  targetLength: z.number().min(30).max(120),
  clipLengthPref: z.enum(["SHORT", "MEDIUM", "LONG", "MIXED"]),
  structure: z.enum(["BY_SCORE", "BY_SHOW", "BY_TOPIC", "CHRONOLOGICAL"]),
  breadthDepth: z.number().min(0).max(100),
  voiceId: z.string(),
  narrationDepth: z.enum(["BRIEF", "STANDARD", "DETAILED"]),
  musicStyle: z.enum(["LOFI", "AMBIENT", "ACOUSTIC", "UPBEAT", "NONE"]),
  transitionStyle: z.enum(["STINGER", "SOFT_FADE", "WHOOSH", "SILENCE"]),
  deliveryDay: z.string(),
  deliveryTime: z.string(),
  deliveryMethod: z.enum(["PRIVATE_RSS", "PUSH", "EMAIL", "IN_APP"]),
});

export const digestConfigUpdateSchema = digestConfigSchema.partial();

export const clipFeedbackSchema = z.object({
  clipId: z.string(),
  feedbackType: z.enum(["thumbsUp", "thumbsDown"]).nullable(),
});

export const generateDigestSchema = z.object({
  configId: z.string(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
