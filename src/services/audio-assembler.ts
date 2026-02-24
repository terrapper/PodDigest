import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import NodeID3 from "node-id3";
import { s3, STORAGE_BUCKET } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { NarrationAudio, Chapter } from "@/types";

// ─── Types ──────────────────────────────────────────────────────

interface AudioSegment {
  type: "narration" | "clip";
  filePath: string;
  duration: number;
  title?: string;
}

// ─── FFmpeg Promise Wrapper ─────────────────────────────────────

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    command
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

// ─── Probe Duration Helper ──────────────────────────────────────

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      if (duration === undefined) {
        return reject(new Error(`Could not determine duration for ${filePath}`));
      }
      resolve(duration);
    });
  });
}

// ─── S3 Operations ──────────────────────────────────────────────

export async function downloadFromS3ToTemp(
  s3Key: string,
  localPath: string
): Promise<void> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: s3Key,
    })
  );

  if (!response.Body) {
    throw new Error(`No body returned from S3 for key: ${s3Key}`);
  }

  const body = response.Body;

  // AWS SDK v3 Body can be a Readable stream, ReadableStream, or Blob
  if (typeof (body as NodeJS.ReadableStream).pipe === "function") {
    await pipeline(body as Readable, createWriteStream(localPath));
    return;
  }

  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    const writeStream = createWriteStream(localPath);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writeStream.write(value);
      }
      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } catch (err) {
      writeStream.destroy();
      throw err;
    }
    return;
  }

  if (body instanceof Blob) {
    const buffer = Buffer.from(await body.arrayBuffer());
    await fs.writeFile(localPath, buffer);
    return;
  }

  throw new Error(`Unexpected S3 body type for key: ${s3Key}`);
}

// ─── URL Download ────────────────────────────────────────────────

export async function downloadFromUrlToTemp(
  url: string,
  localPath: string
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download audio from URL (${response.status}): ${url}`
    );
  }

  if (!response.body) {
    throw new Error(`No body returned from URL: ${url}`);
  }

  const writeStream = createWriteStream(localPath);
  // @ts-expect-error -- ReadableStream from fetch is compatible with Readable.fromWeb
  const readable = Readable.fromWeb(response.body);
  await pipeline(readable, writeStream);
}

// ─── Temp File Cleanup ──────────────────────────────────────────

export async function cleanupTempFiles(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; ignore errors
  }
}

// ─── Clip Extraction ────────────────────────────────────────────

export async function extractClip(
  inputPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  const duration = endTime - startTime;

  if (duration <= 0) {
    throw new Error(
      `Invalid clip duration: startTime=${startTime} endTime=${endTime}`
    );
  }

  const fadeOutStart = Math.max(0, duration - 0.3);

  const command = ffmpeg(inputPath)
    .setStartTime(startTime)
    .setDuration(duration)
    .audioFilters([
      `afade=t=in:st=0:d=0.1`,
      `afade=t=out:st=${fadeOutStart}:d=0.3`,
    ])
    .audioCodec("libmp3lame")
    .audioBitrate("192k")
    .audioFrequency(44100)
    .audioChannels(2)
    .output(outputPath);

  await runFfmpeg(command);
}

// ─── Stinger Generation ─────────────────────────────────────────

async function generateStinger(outputPath: string, duration: number = 0.3): Promise<void> {
  const command = ffmpeg()
    .input(`sine=frequency=800:duration=${duration}`)
    .inputFormat("lavfi")
    .audioFilters([
      "afade=t=in:d=0.05",
      `afade=t=out:st=${duration * 0.5}:d=${duration * 0.5}`,
      "vibrato=f=8:d=0.3",
    ])
    .audioCodec("libmp3lame")
    .audioBitrate("192k")
    .audioFrequency(44100)
    .audioChannels(2)
    .output(outputPath);

  await runFfmpeg(command);
}

async function generateSilencePad(outputPath: string, duration: number = 0.15): Promise<void> {
  const command = ffmpeg()
    .input("anullsrc=r=44100:cl=stereo")
    .inputFormat("lavfi")
    .duration(duration)
    .audioCodec("libmp3lame")
    .audioBitrate("192k")
    .audioFrequency(44100)
    .audioChannels(2)
    .output(outputPath);

  await runFfmpeg(command);
}

// ─── Concatenation with Stinger Transitions ─────────────────────

export async function concatenateWithCrossfades(
  segments: AudioSegment[],
  outputPath: string,
  transitionDuration: number
): Promise<void> {
  if (segments.length === 0) {
    throw new Error("No segments provided for concatenation");
  }

  if (segments.length === 1) {
    await fs.copyFile(segments[0].filePath, outputPath);
    return;
  }

  // For SILENCE transition style (transitionDuration <= 0), use concat demuxer
  // with silence gaps inserted between segments
  if (transitionDuration <= 0) {
    await concatenateWithSilenceGaps(segments, outputPath);
    return;
  }

  // For all other transition styles, use concat demuxer with stinger sounds
  // between segments. This avoids the voice-overlap problem of acrossfade.
  await concatenateWithStingers(segments, outputPath);
}

async function concatenateWithStingers(
  segments: AudioSegment[],
  outputPath: string
): Promise<void> {
  const tempDir = join(
    tmpdir(),
    `poddigest-stinger-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Generate the stinger and silence pad files once
    const stingerPath = join(tempDir, "stinger.mp3");
    const silencePadPath = join(tempDir, "silence-pad.mp3");
    await generateStinger(stingerPath, 0.3);
    await generateSilencePad(silencePadPath, 0.15);

    // Build the concat file list: segment [pad + stinger + pad] segment ...
    const concatLines: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      concatLines.push(`file '${segments[i].filePath}'`);
      if (i < segments.length - 1) {
        concatLines.push(`file '${silencePadPath}'`);
        concatLines.push(`file '${stingerPath}'`);
        concatLines.push(`file '${silencePadPath}'`);
      }
    }

    const concatListPath = join(tempDir, "concat-list.txt");
    await fs.writeFile(concatListPath, concatLines.join("\n"), "utf-8");

    const command = ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .audioFrequency(44100)
      .audioChannels(2)
      .output(outputPath);

    await runFfmpeg(command);
  } finally {
    await cleanupTempFiles(tempDir);
  }
}

async function concatenateWithSilenceGaps(
  segments: AudioSegment[],
  outputPath: string
): Promise<void> {
  const tempDir = join(
    tmpdir(),
    `poddigest-concat-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Generate a 0.5s silence file
    const silencePath = join(tempDir, "silence.mp3");
    const silenceCommand = ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .duration(0.5)
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .audioFrequency(44100)
      .audioChannels(2)
      .output(silencePath);

    await runFfmpeg(silenceCommand);

    // Build the concat file list with silence gaps between segments
    const concatLines: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      concatLines.push(`file '${segments[i].filePath}'`);
      if (i < segments.length - 1) {
        concatLines.push(`file '${silencePath}'`);
      }
    }

    const concatListPath = join(tempDir, "concat-list.txt");
    await fs.writeFile(concatListPath, concatLines.join("\n"), "utf-8");

    const command = ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .audioFrequency(44100)
      .audioChannels(2)
      .output(outputPath);

    await runFfmpeg(command);
  } finally {
    await cleanupTempFiles(tempDir);
  }
}

// ─── Loudness Normalization ─────────────────────────────────────

export async function normalizeLoudness(
  inputPath: string,
  outputPath: string,
  targetLufs: number = -16
): Promise<void> {
  // Pass 1: Measure current loudness
  const measurements = await measureLoudness(inputPath);

  // Pass 2: Apply loudness correction using measured values
  const command = ffmpeg(inputPath)
    .audioFilters([
      [
        `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
        `measured_I=${measurements.inputI}`,
        `measured_TP=${measurements.inputTp}`,
        `measured_LRA=${measurements.inputLra}`,
        `measured_thresh=${measurements.inputThresh}`,
        `linear=true`,
        `print_format=summary`,
      ].join(":"),
    ])
    .audioCodec("libmp3lame")
    .audioBitrate("128k")
    .audioFrequency(44100)
    .audioChannels(2)
    .output(outputPath);

  await runFfmpeg(command);
}

interface LoudnessMeasurements {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
}

function measureLoudness(inputPath: string): Promise<LoudnessMeasurements> {
  return new Promise((resolve, reject) => {
    let stderrOutput = "";

    ffmpeg(inputPath)
      .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json"])
      .format("null")
      .output("/dev/null")
      .on("stderr", (line: string) => {
        stderrOutput += line + "\n";
      })
      .on("end", () => {
        try {
          // Extract the JSON block from stderr output
          // The loudnorm filter outputs JSON with measured values
          const jsonMatch = stderrOutput.match(
            /\{[\s\S]*"input_i"[\s\S]*"input_tp"[\s\S]*\}/
          );

          if (!jsonMatch) {
            return reject(
              new Error("Could not parse loudness measurement from FFmpeg output")
            );
          }

          const data = JSON.parse(jsonMatch[0]);

          resolve({
            inputI: parseFloat(data.input_i),
            inputTp: parseFloat(data.input_tp),
            inputLra: parseFloat(data.input_lra),
            inputThresh: parseFloat(data.input_thresh),
          });
        } catch (err) {
          reject(
            new Error(`Failed to parse loudness measurements: ${err}`)
          );
        }
      })
      .on("error", reject)
      .run();
  });
}

// ─── Transition Duration by Style ───────────────────────────────
// Returns the total time added between segments for chapter timing.
// Non-SILENCE styles use a stinger (~0.3s) with padding (~0.15s each side) = ~0.6s.
// SILENCE uses a 0.5s gap. Returns 0 for SILENCE to signal the silence-gap path.

function getTransitionDuration(transitionStyle: string): number {
  switch (transitionStyle) {
    case "SILENCE":
      return 0; // Signal to use silence gaps instead
    default:
      // All non-silence styles: pad (0.15s) + stinger (0.3s) + pad (0.15s)
      return 0.6;
  }
}

// ─── Chapter Title Helper ───────────────────────────────────────

function buildChapterTitle(podcastTitle: string, episodeTitle: string): string {
  const full = `${podcastTitle}: ${episodeTitle}`;
  if (full.length <= 80) return full;
  return full.slice(0, 77) + "...";
}

// ─── Main Orchestrator ──────────────────────────────────────────

export async function assembleDigest(
  digestId: string,
  narrationAudios: NarrationAudio[]
): Promise<{ s3Key: string; totalDuration: number; chapters: Chapter[] }> {
  const tempDir = join(tmpdir(), "poddigest", digestId);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Load digest with clips (ordered by position) and config
    const digest = await prisma.digest.findUniqueOrThrow({
      where: { id: digestId },
      include: {
        config: true,
        clips: {
          orderBy: { position: "asc" },
          include: {
            episode: {
              include: {
                podcast: true,
              },
            },
          },
        },
      },
    });

    const { config, clips } = digest;
    const transitionDuration = getTransitionDuration(config.transitionStyle);

    // Sort narration audios by position
    const sortedNarrations = [...narrationAudios].sort(
      (a, b) => a.position - b.position
    );

    // Separate narration by type
    const introNarration = sortedNarrations.find((n) => n.type === "intro");
    const outroNarration = sortedNarrations.find((n) => n.type === "outro");
    const transitionNarrations = sortedNarrations
      .filter((n) => n.type === "transition")
      .sort((a, b) => a.position - b.position);

    if (!introNarration || !outroNarration) {
      throw new Error("Missing intro or outro narration audio");
    }

    // ── Step 1: Download source episode audio files to temp ─────

    // Download source episode audio from original podcast URLs
    const episodeAudioPaths = new Map<string, string>();
    for (const clip of clips) {
      if (!episodeAudioPaths.has(clip.episodeId)) {
        const localPath = join(tempDir, `episode-${clip.episodeId}.mp3`);
        await downloadFromUrlToTemp(clip.episode.audioUrl, localPath);
        episodeAudioPaths.set(clip.episodeId, localPath);
      }
    }

    // ── Step 2: Download narration audio files to temp ──────────

    const narrationPaths = new Map<string, string>();
    for (const narration of sortedNarrations) {
      const localPath = join(
        tempDir,
        `narration-${narration.position}-${narration.type}.mp3`
      );
      await downloadFromS3ToTemp(narration.s3Key, localPath);
      narrationPaths.set(`${narration.position}-${narration.type}`, localPath);
    }

    // ── Step 3: Extract clips from source audio ─────────────────

    const clipPaths: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const episodePath = episodeAudioPaths.get(clip.episodeId)!;
      const clipPath = join(tempDir, `clip-${i}.mp3`);
      await extractClip(episodePath, clip.startTime, clip.endTime, clipPath);
      clipPaths.push(clipPath);
    }

    // ── Step 4: Build ordered segment list ──────────────────────
    // Pattern: intro → [transition → clip] x N → outro

    const segments: AudioSegment[] = [];

    // Add intro narration
    const introPath = narrationPaths.get(
      `${introNarration.position}-${introNarration.type}`
    )!;
    const introDuration = await probeDuration(introPath);
    segments.push({
      type: "narration",
      filePath: introPath,
      duration: introDuration,
    });

    // Add transition-clip pairs
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const transition = transitionNarrations[i];

      if (transition) {
        const transPath = narrationPaths.get(
          `${transition.position}-${transition.type}`
        )!;
        const transDuration = await probeDuration(transPath);
        segments.push({
          type: "narration",
          filePath: transPath,
          duration: transDuration,
        });
      }

      const clipDuration = await probeDuration(clipPaths[i]);
      segments.push({
        type: "clip",
        filePath: clipPaths[i],
        duration: clipDuration,
        title: buildChapterTitle(
          clip.episode.podcast.title,
          clip.episode.title
        ),
      });
    }

    // Add outro narration
    const outroPath = narrationPaths.get(
      `${outroNarration.position}-${outroNarration.type}`
    )!;
    const outroDuration = await probeDuration(outroPath);
    segments.push({
      type: "narration",
      filePath: outroPath,
      duration: outroDuration,
    });

    // ── Step 5: Concatenate with transitions ────────────────────

    const rawOutputPath = join(tempDir, "raw-digest.mp3");
    await concatenateWithCrossfades(segments, rawOutputPath, transitionDuration);

    // ── Step 6: Normalize loudness ──────────────────────────────

    const normalizedPath = join(tempDir, "normalized-digest.mp3");
    await normalizeLoudness(rawOutputPath, normalizedPath, -16);

    const finalPath = normalizedPath;

    // ── Step 6b: Write ID3 metadata ─────────────────────────────
    // Use node-id3 to write tags directly — avoids fluent-ffmpeg
    // argument parsing issues with metadata flags.

    NodeID3.write(
      {
        title: digest.title,
        artist: "PodDigest AI",
        album: "PodDigest Weekly",
        genre: "Podcast",
        year: String(new Date().getFullYear()),
      },
      finalPath
    );

    // ── Step 7: Build chapter markers ───────────────────────────

    const chapters: Chapter[] = [];
    let cumulativeTime = 0;
    // Gap between segments: stinger mode uses pad+stinger+pad (0.6s),
    // silence mode uses a 0.5s silence gap
    const gapDuration = transitionDuration > 0 ? transitionDuration : 0.5;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (segment.type === "clip" && segment.title) {
        chapters.push({
          title: segment.title,
          startTime: cumulativeTime,
          endTime: cumulativeTime + segment.duration,
        });
      }

      cumulativeTime += segment.duration;

      // Add gap duration between segments (not after the last one)
      if (i < segments.length - 1) {
        cumulativeTime += gapDuration;
      }
    }

    // Use the actual final file duration for accuracy
    const totalDuration = await probeDuration(finalPath);

    // Adjust the last chapter's endTime to match the actual total duration
    if (chapters.length > 0) {
      const lastChapter = chapters[chapters.length - 1];
      if (lastChapter.endTime > totalDuration) {
        lastChapter.endTime = totalDuration;
      }
    }

    // ── Step 8: Upload to S3 ────────────────────────────────────

    const s3Key = `digests/${digestId}/digest.mp3`;
    const fileBuffer = await fs.readFile(finalPath);

    await s3.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: "audio/mpeg",
        Metadata: {
          digestId,
          clipCount: String(clips.length),
          totalDuration: String(Math.round(totalDuration)),
        },
      })
    );

    return {
      s3Key,
      totalDuration: Math.round(totalDuration),
      chapters,
    };
  } finally {
    // ── Cleanup temp files ────────────────────────────────────────
    await cleanupTempFiles(tempDir);
  }
}
