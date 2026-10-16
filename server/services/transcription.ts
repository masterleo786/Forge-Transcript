import { openai } from "../replit_integrations/audio/client";
import { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile, readdir, mkdir, rm } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import { ffmpegBinary, ffprobeBinary } from "./mediaTools";

const MAX_CHUNK_BYTES = 20 * 1024 * 1024;
const MAX_CHUNK_SECONDS = 600;

export interface TranscriptionResult {
  text: string;
  srtContent: string;
  vttContent: string;
  duration: number;
  segments: Array<{ start: number; end: number; text: string }>;
}

function toSrtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms, 3)}`;
}

function toVttTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

function buildSrt(segments: Array<{ start: number; end: number; text: string }>): string {
  if (!segments.length) return "";
  return segments
    .map((seg, i) => `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text.trim()}\n`)
    .join("\n");
}

function buildVtt(segments: Array<{ start: number; end: number; text: string }>): string {
  if (!segments.length) return "";
  const lines = ["WEBVTT", ""];
  for (const seg of segments) {
    lines.push(`${toVttTime(seg.start)} --> ${toVttTime(seg.end)}`);
    lines.push(seg.text.trim());
    lines.push("");
  }
  return lines.join("\n");
}

async function compressAudio(buffer: Buffer, inputFormat: string): Promise<Buffer> {
  const inputPath = path.join(os.tmpdir(), `compress-in-${randomUUID()}.${inputFormat}`);
  const outputPath = path.join(os.tmpdir(), `compress-out-${randomUUID()}.mp3`);
  try {
    await writeFile(inputPath, buffer);
    await spawnAsync(ffmpegBinary, ["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k", "-y", outputPath]);
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

async function getAudioDuration(buffer: Buffer, format: string): Promise<number> {
  const extension = /^[a-z0-9]{1,8}$/i.test(format) ? format : "audio";
  const inputPath = path.join(os.tmpdir(), `duration-${randomUUID()}.${extension}`);
  try {
    await writeFile(inputPath, buffer);
    const output = await spawnCaptureAsync(ffprobeBinary, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("The audio duration could not be determined.");
    }
    return duration;
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}

async function getAudioFileDuration(filePath: string): Promise<number> {
  const output = await spawnCaptureAsync(ffprobeBinary, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("The audio duration could not be determined.");
  }
  return duration;
}

function chooseChunkSeconds(duration: number, bytes: number): number {
  // ffprobe can report a few hundredths of a second beyond an exact boundary
  // (for example, a 3-hour MP3 as 10800.04s). Round before counting chunks so
  // that encoding padding does not create an unnecessary extra API call.
  const roundedDuration = Math.max(1, Math.round(duration));
  const sizeLimitedSeconds = bytes > MAX_CHUNK_BYTES
    ? Math.floor((MAX_CHUNK_BYTES / bytes) * roundedDuration * 0.8)
    : MAX_CHUNK_SECONDS;
  const maxChunkSeconds = Math.max(60, Math.min(MAX_CHUNK_SECONDS, sizeLimitedSeconds));
  const chunkCount = Math.ceil(roundedDuration / maxChunkSeconds);
  // Use the measured duration when spreading it across the rounded chunk count.
  // This absorbs codec padding into the last regular segment instead of
  // producing a tiny extra file at an exact boundary.
  return Math.ceil(duration / chunkCount);
}

async function splitIntoChunks(
  buffer: Buffer,
  format: string,
  chunkSeconds: number,
): Promise<Buffer[]> {
  const id = randomUUID();
  const extension = /^[a-z0-9]{1,8}$/i.test(format) ? format : "audio";
  const inputPath = path.join(os.tmpdir(), `split-in-${id}.${extension}`);
  const outDir = path.join(os.tmpdir(), `split-${id}`);
  const outPattern = path.join(outDir, "chunk-%03d.mp3");
  try {
    await writeFile(inputPath, buffer);
    await mkdir(outDir, { recursive: true });
    await spawnAsync(ffmpegBinary, [
      "-i", inputPath,
      "-map", "0:a:0",
      "-vn",
      "-f", "segment",
      "-segment_time", String(chunkSeconds),
      "-reset_timestamps", "1",
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "libmp3lame",
      "-b:a", "32k",
      "-y", outPattern,
    ]);
    const files = (await readdir(outDir)).sort();
    const chunks: Buffer[] = [];
    for (const f of files) {
      const chunkPath = path.join(outDir, f);
      chunks.push(await readFile(chunkPath));
      await unlink(chunkPath).catch(() => {});
    }
    if (!chunks.length) throw new Error("Audio splitting produced no chunks.");
    return chunks;
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outDir).catch(() => {});
  }
}

async function spawnCaptureAsync(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    process.stdout.setEncoding("utf8");
    process.stderr.setEncoding("utf8");
    process.stdout.on("data", (data: string) => { stdout += data; });
    process.stderr.on("data", (data: string) => { stderr += data; });
    process.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.trim().slice(-1000)}`));
    });
    process.on("error", reject);
  });
}

function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = "";
    p.stderr.setEncoding("utf8");
    p.stderr.on("data", (data: string) => { stderr += data; });
    p.on("close", (code) => (
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} exited ${code}: ${stderr.trim().slice(-800)}`))
    ));
    p.on("error", reject);
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

// Map any non-standard codes to valid Whisper ISO 639-1 codes
function normaliseLanguage(lang: string | undefined): string | undefined {
  if (!lang || lang === "auto") return undefined;
  const map: Record<string, string> = {
    "zh-yue": "zh",
    "zh-cantonese": "zh",
    "ur-roman": "ur",
  };
  return map[lang] ?? lang;
}

/**
 * Roman Urdu is an output format, not a Whisper language. Transcribe Urdu
 * first, then transliterate it without translating its meaning.
 */
export async function transliterateToRomanUrdu(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You transliterate Urdu into Roman Urdu using the English alphabet. Preserve the exact meaning, wording, order, names, numbers, punctuation, and line breaks. Do not translate to English, summarize, or add commentary. Return only the Roman Urdu text.",
        },
        { role: "user", content: text },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    // A transliteration outage must not turn a successful transcription into
    // a failed job; the original Urdu text is still useful to the user.
    console.error("[transcription] Roman Urdu formatting failed:", error?.message);
    return text;
  }
}

async function transcribeChunk(
  buffer: Buffer,
  format: string,
  language: string | undefined,
  timeOffset: number = 0
): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }>; duration: number }> {

  const lang = normaliseLanguage(language);

  // PRIMARY: gpt-4o-transcribe — the configured Replit speech endpoint
  // rejects whisper-1; the higher-accuracy model returns transcript JSON.
  try {
    const params: any = {
      file: await toFile(buffer, `audio.${format}`),
      model: "gpt-4o-transcribe",
      response_format: "json",
    };
    if (lang) params.language = lang;

    const response = await openai.audio.transcriptions.create(params) as any;
    const text = (typeof response === "string" ? response : response?.text || "").trim();

    if (!text) throw new Error("Empty response from gpt-4o-transcribe");

    const rawSegments: Array<{ start: number; end: number; text: string }> =
      (response.segments || []).map((s: any) => ({
        start: s.start + timeOffset,
        end: s.end + timeOffset,
        text: s.text,
      }));

    return {
      text,
      segments: rawSegments,
      duration: (response.duration || 0) + timeOffset,
    };
  } catch (primaryErr: any) {
    console.warn(`[transcription] gpt-4o-transcribe failed (${primaryErr?.message}), trying gpt-4o-mini-transcribe`);
  }

  // FALLBACK: gpt-4o-mini-transcribe — supported lower-cost recovery model.
  try {
    const fallbackParams: any = {
      file: await toFile(buffer, `audio.${format}`),
      model: "gpt-4o-mini-transcribe",
      response_format: "text",
    };
    if (lang) fallbackParams.language = lang;

    const response = await openai.audio.transcriptions.create(fallbackParams) as any;
    const text = (typeof response === "string" ? response : (response?.text || "")).trim();
    if (!text) throw new Error("The transcription service returned no text");

    return { text, segments: [], duration: 0 };
  } catch (fallbackErr: any) {
    throw new Error(`Transcription failed: ${fallbackErr?.message}`);
  }
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = "mp3",
  language?: string
): Promise<TranscriptionResult> {
  let buf = audioBuffer;
  let fmt = format;
  const audioDuration = await getAudioDuration(buf, fmt);

  if (buf.length > MAX_CHUNK_BYTES) {
    buf = await compressAudio(buf, format);
    fmt = "mp3";
  }

  if (audioDuration > MAX_CHUNK_SECONDS || buf.length > MAX_CHUNK_BYTES) {
    const chunkSeconds = chooseChunkSeconds(audioDuration, buf.length);
    const chunks = await splitIntoChunks(buf, fmt, chunkSeconds);
    const results = await mapWithConcurrency(chunks, 2, async (chunk, i) => {
      try {
        return await transcribeChunk(chunk, "mp3", language, i * chunkSeconds);
      } catch (error: any) {
        throw new Error(`Transcription failed for audio segment ${i + 1} of ${chunks.length}: ${error?.message || "unknown error"}`);
      }
    });

    const allSegments = results.flatMap((r) => r.segments);
    allSegments.sort((a, b) => a.start - b.start);
    const fullText = results.map((r) => r.text.trim()).filter(Boolean).join(" ");
    if (!fullText) throw new Error("No speech was transcribed from the audio.");

    return {
      text: fullText,
      srtContent: buildSrt(allSegments),
      vttContent: buildVtt(allSegments),
      duration: Math.round(audioDuration),
      segments: allSegments,
    };
  }

  const result = await transcribeChunk(buf, fmt, language, 0);
  if (!result.text.trim()) throw new Error("No speech was transcribed from the audio.");
  return {
    text: result.text,
    srtContent: buildSrt(result.segments),
    vttContent: buildVtt(result.segments),
    duration: result.duration > 0 ? result.duration : Math.round(audioDuration),
    segments: result.segments,
  };
}

export async function transcribeAudioFile(
  inputPath: string,
  language?: string,
): Promise<TranscriptionResult> {
  const duration = await getAudioFileDuration(inputPath);
  const chunkSeconds = chooseChunkSeconds(duration, 0);
  const outDir = path.join(os.tmpdir(), `transcribe-file-${randomUUID()}`);
  const outputPattern = path.join(outDir, "chunk-%03d.mp3");

  try {
    await mkdir(outDir, { recursive: true });
    await spawnAsync(ffmpegBinary, [
      "-hide_banner", "-loglevel", "error",
      "-i", inputPath,
      "-map", "0:a:0",
      "-vn",
      "-f", "segment",
      "-segment_time", String(chunkSeconds),
      "-reset_timestamps", "1",
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "libmp3lame",
      "-b:a", "32k",
      "-y", outputPattern,
    ]);

    const chunkPaths = (await readdir(outDir))
      .filter((name) => name.endsWith(".mp3"))
      .sort()
      .map((name) => path.join(outDir, name));
    if (!chunkPaths.length) {
      throw new Error("Audio preparation produced no transcription segments.");
    }

    const results = await mapWithConcurrency(chunkPaths, 2, async (chunkPath, index) => {
      try {
        const chunk = await readFile(chunkPath);
        return await transcribeChunk(chunk, "mp3", language, index * chunkSeconds);
      } catch (error: any) {
        throw new Error(
          `Transcription failed for audio segment ${index + 1} of ${chunkPaths.length}: ${error?.message || "unknown error"}`,
        );
      } finally {
        await unlink(chunkPath).catch(() => {});
      }
    });

    const segments = results.flatMap((result) => result.segments).sort((a, b) => a.start - b.start);
    const text = results.map((result) => result.text.trim()).filter(Boolean).join(" ");
    if (!text) throw new Error("No speech was transcribed from the audio.");

    return {
      text,
      srtContent: buildSrt(segments),
      vttContent: buildVtt(segments),
      duration: Math.round(duration),
      segments,
    };
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function generateSummary(transcript: string): Promise<string> {
  if (!transcript || transcript.trim().length < 20) return "";
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes transcripts concisely. Respond in the same language as the transcript. Return only the summary text without any markdown or conversational filler.",
        },
        { role: "user", content: `Summarize this transcript:\n\n${transcript.slice(0, 12000)}` },
      ],
    });
    return response.choices[0]?.message?.content || "";
  } catch (err: any) {
    console.error("[summary] generateSummary failed:", err?.message);
    return "";
  }
}
