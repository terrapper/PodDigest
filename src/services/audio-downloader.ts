// Audio Downloader Service
// Downloads full episode audio files to S3 for processing
// Streams from source URL, uploads to S3, with progress tracking

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import type { DownloadProgress } from "@/types";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

function episodeS3Key(episodeId: string): string {
  return `episodes/${episodeId}/audio.mp3`;
}

/**
 * Check if audio for this episode already exists in S3.
 */
async function isAudioDownloaded(episodeId: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: episodeS3Key(episodeId),
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Download episode audio from its source URL and upload to S3.
 *
 * - Fetches the episode record from the database to obtain the audioUrl.
 * - If the audio is already in S3, returns immediately with the existing key/size.
 * - Streams the download using fetch, tracking progress via Content-Length.
 * - Uploads the complete buffer to S3 as `episodes/{episodeId}/audio.mp3`.
 */
export async function downloadEpisodeAudio(
  episodeId: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ s3Key: string; sizeBytes: number }> {
  const episode = await prisma.episode.findUniqueOrThrow({
    where: { id: episodeId },
  });

  const s3Key = episodeS3Key(episodeId);

  // If already downloaded, return existing metadata without re-downloading
  if (await isAudioDownloaded(episodeId)) {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
      })
    );
    return { s3Key, sizeBytes: head.ContentLength || 0 };
  }

  // Fetch audio from the episode's source URL
  const response = await fetch(episode.audioUrl, {
    headers: { "User-Agent": "PodDigest/1.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download audio for episode ${episodeId}: HTTP ${response.status} ${response.statusText}`
    );
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(`No response body available for episode ${episodeId} audio download`);
  }

  // Read the stream in chunks, tracking progress
  const chunks: Uint8Array[] = [];
  let bytesDownloaded = 0;

  // Emit initial progress
  onProgress?.({
    episodeId,
    bytesDownloaded: 0,
    totalBytes,
    percentage: totalBytes ? 0 : null,
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    bytesDownloaded += value.length;

    onProgress?.({
      episodeId,
      bytesDownloaded,
      totalBytes,
      percentage: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : null,
    });
  }

  const body = Buffer.concat(chunks);

  // Upload the complete audio buffer to S3
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: "audio/mpeg",
      ContentLength: body.length,
      Metadata: {
        episodeId,
        originalUrl: episode.audioUrl,
      },
    })
  );

  return { s3Key, sizeBytes: body.length };
}

/**
 * Get a readable stream for an audio file stored in S3.
 *
 * Returns the S3 object body as a ReadableStream, suitable for piping
 * to transcription services, FFmpeg, or other downstream consumers.
 */
export async function getS3AudioStream(s3Key: string): Promise<ReadableStream> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    })
  );

  if (!response.Body) {
    throw new Error(`No body returned from S3 for key: ${s3Key}`);
  }

  // The AWS SDK v3 returns a web ReadableStream in Node 18+ environments.
  // If the body is a Node.js Readable (stream), convert it to a web ReadableStream.
  const body = response.Body;

  if (body instanceof ReadableStream) {
    return body;
  }

  // Handle the case where Body is a Blob or a Node Readable (sdk may return
  // different types depending on environment). The AWS SDK v3 Body type is
  // SdkStream<ReadableStream | NodeJS.ReadableStream | Blob>.
  if (typeof (body as NodeJS.ReadableStream).pipe === "function") {
    const nodeStream = body as NodeJS.ReadableStream;
    return new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err: Error) => {
          controller.error(err);
        });
      },
      cancel() {
        if (typeof (nodeStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy === "function") {
          (nodeStream as NodeJS.ReadableStream & { destroy: () => void }).destroy();
        }
      },
    });
  }

  // Fallback: if it's a Blob, convert via arrayBuffer
  if (body instanceof Blob) {
    const arrayBuffer = await body.arrayBuffer();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(arrayBuffer));
        controller.close();
      },
    });
  }

  throw new Error(`Unexpected S3 body type for key: ${s3Key}`);
}

/**
 * Get the public S3 URL for an audio file.
 *
 * If a CDN_DOMAIN environment variable is set (e.g., CloudFront), the URL
 * will use that domain. Otherwise, falls back to the direct S3 bucket URL.
 */
export function getSignedAudioUrl(s3Key: string): string {
  const cdnDomain = process.env.CDN_DOMAIN;
  if (cdnDomain) {
    return `https://${cdnDomain}/${s3Key}`;
  }
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Delete an object from S3.
 *
 * Used for cleanup after digest assembly or when removing old episode data.
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    })
  );
}

/**
 * Download multiple episodes sequentially with per-episode progress tracking.
 *
 * Returns a map of episodeId -> s3Key for all successfully downloaded episodes.
 */
export async function downloadEpisodes(
  episodeIds: string[],
  onProgress?: (episodeIndex: number, total: number, progress: DownloadProgress) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < episodeIds.length; i++) {
    const episodeId = episodeIds[i];
    const { s3Key } = await downloadEpisodeAudio(episodeId, (progress) => {
      onProgress?.(i, episodeIds.length, progress);
    });
    results.set(episodeId, s3Key);
  }

  return results;
}
