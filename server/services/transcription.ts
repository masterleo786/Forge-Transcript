import { openai } from "../replit_integrations/audio/client";
import { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile, readdir } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir, join } from "os";
import path from "path";

const MAX_CHUNK_BYTES = 20 * 1024 * 1024; // 20 MB — safely under OpenAI's 25 MB hard limit

// ─── Compress audio to 32 kbps mono MP3 so large files shrink dramatically ────
async function compressAudio(buffer: Buffer, inputFormat: string): Promise<Buffer> {
  const inputPath = path.join(tmpdir(), `compress-in-${randomUUID()}.${inputFormat}`);
  const outputPath = path.join(tmpdir(), `compress-out-${randomUUID()}.mp3`);
  try {
    await writeFile(inputPath, buffer);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-i", inputPath,
        "-vn",
        "-ar", "16000",
        "-ac", "1",
        "-b:a", "32k",
        "-y",
        outputPath,
      ]);
      ff.stderr.on("data", () => {});
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg compress exit ${code}`))));
      ff.on("error", reject);
    });
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

// ─── Split audio file into 10-minute segments ─────────────────────────────────
async function splitIntoChunks(buffer: Buffer): Promise<Buffer[]> {
  const inputPath = path.join(tmpdir(), `split-in-${randomUUID()}.mp3`);
  const outDir = path.join(tmpdir(), `split-${randomUUID()}`);
  const outPattern = path.join(outDir, `chunk-%03d.mp3`);

  try {
    await writeFile(inputPath, buffer);
    // Create output dir
    const { mkdirSync } = await import("fs");
    mkdirSync(outDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-i", inputPath,
        "-f", "segment",
        "-segment_time", "600", // 10 min per chunk
        "-c", "copy",
        "-y",
        outPattern,
      ]);
      ff.stderr.on("data", () => {});
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg split exit ${code}`))));
      ff.on("error", reject);
    });

    const files = (await readdir(outDir)).sort();
    const chunks: Buffer[] = [];
    for (const f of files) {
      const buf = await readFile(path.join(outDir, f));
      chunks.push(buf);
      await unlink(path.join(outDir, f)).catch(() => {});
    }
    return chunks;
  } finally {
    await unlink(inputPath).catch(() => {});
    try { const { rmdirSync } = await import("fs"); rmdirSync(outDir); } catch {}
  }
}

// ─── Transcribe a single chunk ────────────────────────────────────────────────
async function transcribeChunk(buffer: Buffer, format: string, language?: string): Promise<string> {
  const params: any = {
    file: await toFile(buffer, `audio.${format}`),
    model: "gpt-4o-mini-transcribe",
    response_format: "json",
  };
  // Only add language param if explicitly set (not auto-detect)
  if (language && language !== "auto") {
    params.language = language;
  }
  const response = await openai.audio.transcriptions.create(params);
  return response.text;
}

// ─── Main export: transcribe audio of any size, any language ─────────────────
export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = "mp3",
  language?: string
): Promise<string> {
  // Step 1: Compress to 32kbps mono MP3 if the file is large
  let buf = audioBuffer;
  let fmt = format;
  if (buf.length > MAX_CHUNK_BYTES) {
    buf = await compressAudio(buf, format);
    fmt = "mp3";
  }

  // Step 2: If still over 20 MB, split into 10-minute chunks and transcribe each
  if (buf.length > MAX_CHUNK_BYTES) {
    const chunks = await splitIntoChunks(buf);
    const results = await Promise.all(
      chunks.map((chunk) => transcribeChunk(chunk, "mp3", language))
    );
    return results.join(" ");
  }

  // Step 3: Single-shot transcription
  return transcribeChunk(buf, fmt, language);
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
