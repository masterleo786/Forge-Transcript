import { openai } from "../replit_integrations/audio/client";
import { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile, readdir, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";

const MAX_CHUNK_BYTES = 20 * 1024 * 1024; // 20 MB — safely under OpenAI's 25 MB limit

export interface TranscriptionResult {
  text: string;
  srtContent: string;
  vttContent: string;
  duration: number;
  segments: Array<{ start: number; end: number; text: string }>;
}

// ─── Time formatting ──────────────────────────────────────────────────────────

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
  return segments
    .map((seg, i) => `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text.trim()}\n`)
    .join("\n");
}

function buildVtt(segments: Array<{ start: number; end: number; text: string }>): string {
  const lines = ["WEBVTT", ""];
  for (const seg of segments) {
    lines.push(`${toVttTime(seg.start)} --> ${toVttTime(seg.end)}`);
    lines.push(seg.text.trim());
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Compress audio to 32 kbps mono MP3 ──────────────────────────────────────

async function compressAudio(buffer: Buffer, inputFormat: string): Promise<Buffer> {
  const inputPath = path.join(os.tmpdir(), `compress-in-${randomUUID()}.${inputFormat}`);
  const outputPath = path.join(os.tmpdir(), `compress-out-${randomUUID()}.mp3`);
  try {
    await writeFile(inputPath, buffer);
    await spawnAsync("ffmpeg", ["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k", "-y", outputPath]);
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

// ─── Split compressed audio into 10-min chunks ───────────────────────────────

async function splitIntoChunks(buffer: Buffer): Promise<Buffer[]> {
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `split-in-${id}.mp3`);
  const outDir = path.join(os.tmpdir(), `split-${id}`);
  const outPattern = path.join(outDir, "chunk-%03d.mp3");
  try {
    await writeFile(inputPath, buffer);
    await mkdir(outDir, { recursive: true });
    await spawnAsync("ffmpeg", ["-i", inputPath, "-f", "segment", "-segment_time", "600", "-c", "copy", "-y", outPattern]);
    const files = (await readdir(outDir)).sort();
    const chunks: Buffer[] = [];
    for (const f of files) {
      const chunkPath = path.join(outDir, f);
      chunks.push(await readFile(chunkPath));
      await unlink(chunkPath).catch(() => {});
    }
    return chunks;
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outDir).catch(() => {});
  }
}

function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    p.stderr.on("data", () => {});
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on("error", reject);
  });
}

// ─── Transcribe a single chunk with verbose_json (real timestamps) ────────────

async function transcribeChunk(
  buffer: Buffer,
  format: string,
  language: string | undefined,
  timeOffset: number = 0
): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }>; duration: number }> {
  const params: any = {
    file: await toFile(buffer, `audio.${format}`),
    model: "whisper-1",
    response_format: "verbose_json",
  };
  if (language && language !== "auto") params.language = language;

  const response = await openai.audio.transcriptions.create(params) as any;

  const rawSegments: Array<{ start: number; end: number; text: string }> =
    (response.segments || []).map((s: any) => ({
      start: s.start + timeOffset,
      end: s.end + timeOffset,
      text: s.text,
    }));

  return {
    text: response.text || "",
    segments: rawSegments,
    duration: (response.duration || 0) + timeOffset,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = "mp3",
  language?: string
): Promise<TranscriptionResult> {
  let buf = audioBuffer;
  let fmt = format;

  // Step 1: Compress if large
  if (buf.length > MAX_CHUNK_BYTES) {
    buf = await compressAudio(buf, format);
    fmt = "mp3";
  }

  // Step 2: If still large, split into 10-min chunks
  if (buf.length > MAX_CHUNK_BYTES) {
    const chunks = await splitIntoChunks(buf);
    const CHUNK_SECONDS = 600;
    const results = await Promise.all(
      chunks.map((chunk, i) => transcribeChunk(chunk, "mp3", language, i * CHUNK_SECONDS))
    );

    const allSegments = results.flatMap((r) => r.segments);
    const fullText = results.map((r) => r.text).join(" ");
    const totalDuration = results[results.length - 1]?.duration || 0;

    return {
      text: fullText,
      srtContent: buildSrt(allSegments),
      vttContent: buildVtt(allSegments),
      duration: totalDuration,
      segments: allSegments,
    };
  }

  // Step 3: Single chunk
  const result = await transcribeChunk(buf, fmt, language, 0);
  return {
    text: result.text,
    srtContent: buildSrt(result.segments),
    vttContent: buildVtt(result.segments),
    duration: result.duration,
    segments: result.segments,
  };
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function generateSummary(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that summarizes transcripts concisely. Return only the summary text without any markdown or conversational filler.",
      },
      { role: "user", content: `Please summarize the following transcript:\n\n${transcript}` },
    ],
  });
  return response.choices[0]?.message?.content || "No summary available.";
}
