// Centralized S3 client configured for Supabase Storage S3-compatible API
// All services import from here instead of creating their own S3Client instances

import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.STORAGE_REGION || "us-east-1",
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "poddigest";

/**
 * Build a public URL for an object in Supabase Storage.
 *
 * Uses the Supabase public storage URL pattern:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
 *
 * Falls back to a CDN domain if CDN_DOMAIN is set.
 */
export function getPublicUrl(s3Key: string): string {
  const cdnDomain = process.env.CDN_DOMAIN;
  if (cdnDomain) {
    return `https://${cdnDomain}/${s3Key}`;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${s3Key}`;
  }

  // Fallback for non-Supabase S3 (e.g. AWS)
  const region = process.env.STORAGE_REGION || "us-east-1";
  return `https://${STORAGE_BUCKET}.s3.${region}.amazonaws.com/${s3Key}`;
}
