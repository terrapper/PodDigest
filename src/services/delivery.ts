// Delivery Engine Service
// Uploads to S3/CDN, updates private RSS feed, triggers notifications

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, STORAGE_BUCKET, getPublicUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────

interface DigestForFeed {
  id: string;
  title: string;
  audioUrl: string | null;
  totalDuration: number | null;
  clipCount: number;
  createdAt: Date;
  weekStart: Date | null;
  weekEnd: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Convert a duration in seconds to HH:MM:SS format.
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":");
}

/**
 * Convert a Date to an RFC 2822 formatted string for RSS feeds.
 */
function toRfc2822(date: Date): string {
  return date.toUTCString();
}

/**
 * Escape XML special characters in text content.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── S3 URL Helpers ───────────────────────────────────────────

/**
 * Returns the public URL for a user's private RSS feed.
 */
export function getRssFeedUrl(userId: string): string {
  return getPublicUrl(`feeds/${userId}/feed.xml`);
}

// ─── RSS Feed Generation ──────────────────────────────────────

/**
 * Build an RSS 2.0 XML string from user info and their completed digests.
 *
 * Includes the iTunes podcast namespace for compatibility with podcast apps.
 * Each digest becomes an `<item>` element with an `<enclosure>` tag pointing
 * to the digest's MP3 audio URL.
 */
export function buildFeedXml(
  user: { id: string; name: string | null; email: string },
  digests: DigestForFeed[]
): string {
  const userName = escapeXml(user.name || user.email);
  const feedUrl = getRssFeedUrl(user.id);

  const items = digests
    .filter((d) => d.audioUrl)
    .map((digest) => {
      const title = escapeXml(digest.title);
      const description = escapeXml(
        `Weekly digest with ${digest.clipCount} clips`
      );
      const duration = digest.totalDuration
        ? formatDuration(digest.totalDuration)
        : "00:00:00";
      const pubDate = toRfc2822(digest.createdAt);

      return `    <item>
      <title>${title}</title>
      <description>${description}</description>
      <enclosure url="${escapeXml(digest.audioUrl!)}" length="0" type="audio/mpeg"/>
      <guid isPermaLink="false">${escapeXml(digest.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${duration}</itunes:duration>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PodDigest — ${userName}'s Weekly Digest</title>
    <description>AI-curated weekly podcast highlights</description>
    <link>https://poddigest.ai</link>
    <language>en</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:author>PodDigest AI</itunes:author>
    <itunes:summary>Your personalized weekly podcast digest</itunes:summary>
${items}
  </channel>
</rss>`;
}

/**
 * Generate a private RSS feed for a user's completed digests and upload
 * the XML to S3.
 *
 * The feed is stored at `feeds/{userId}/feed.xml` and served either via
 * CloudFront (if CDN_DOMAIN is set) or directly from the S3 bucket.
 *
 * Returns the public URL of the uploaded feed.
 */
export async function generatePrivateRssFeed(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const digests = await prisma.digest.findMany({
    where: {
      userId,
      status: "COMPLETED",
      audioUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      audioUrl: true,
      totalDuration: true,
      clipCount: true,
      createdAt: true,
      weekStart: true,
      weekEnd: true,
    },
  });

  const xml = buildFeedXml(
    { id: user.id, name: user.name, email: user.email },
    digests
  );

  const s3Key = `feeds/${userId}/feed.xml`;

  await s3.send(
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: s3Key,
      Body: xml,
      ContentType: "application/rss+xml; charset=utf-8",
      CacheControl: "max-age=300",
    })
  );

  const feedUrl = getRssFeedUrl(userId);

  console.log(
    `[delivery] Generated private RSS feed for user ${userId}: ${feedUrl} (${digests.length} digest(s))`
  );

  return feedUrl;
}

// ─── Main Delivery Function ───────────────────────────────────

/**
 * Deliver a completed digest to the user based on their configured
 * delivery method.
 *
 * - PRIVATE_RSS: Regenerates the user's private RSS feed XML and uploads to S3.
 * - EMAIL: Sends an email with the digest link (placeholder — logs the action).
 * - PUSH: Sends a push notification (placeholder — logs the action).
 * - IN_APP: Marks the digest as delivered (the digest is already accessible in the DB).
 *
 * After delivery, the digest status is updated to COMPLETED.
 */
export async function deliverDigest(digestId: string): Promise<void> {
  const digest = await prisma.digest.findUniqueOrThrow({
    where: { id: digestId },
    include: {
      config: true,
      user: true,
    },
  });

  console.log(
    `[delivery] Delivering digest "${digest.title}" (${digestId}) via ${digest.config.deliveryMethod}`
  );

  const deliveryMethod = digest.config.deliveryMethod;

  switch (deliveryMethod) {
    case "PRIVATE_RSS": {
      const feedUrl = await generatePrivateRssFeed(digest.userId);
      console.log(
        `[delivery] Private RSS feed updated for user ${digest.userId}: ${feedUrl}`
      );
      break;
    }

    case "EMAIL": {
      // Placeholder: In production, integrate with an email service (SES, SendGrid, etc.)
      const digestUrl = digest.audioUrl || `https://poddigest.ai/dashboard`;
      console.log(
        `[delivery] EMAIL: Would send email to ${digest.user.email} with digest link: ${digestUrl}`
      );
      break;
    }

    case "PUSH": {
      // Placeholder: In production, integrate with Web Push API or a push service
      console.log(
        `[delivery] PUSH: Would send push notification to user ${digest.userId} for digest "${digest.title}"`
      );
      break;
    }

    case "IN_APP": {
      // No additional action needed — the digest is already in the database
      // and accessible through the dashboard.
      console.log(
        `[delivery] IN_APP: Digest "${digest.title}" is available in-app for user ${digest.userId}`
      );
      break;
    }

    default: {
      console.warn(
        `[delivery] Unknown delivery method "${deliveryMethod}" for digest ${digestId}, falling back to IN_APP`
      );
      break;
    }
  }

  await prisma.digest.update({
    where: { id: digestId },
    data: { status: "COMPLETED" },
  });

  console.log(
    `[delivery] Digest "${digest.title}" (${digestId}) marked as COMPLETED`
  );
}
