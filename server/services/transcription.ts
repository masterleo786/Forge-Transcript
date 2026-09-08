import { openai } from "../replit_integrations/audio/client";
import { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile, readdir, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";

const MAX_CHUNK_BYTES = 20 * 1024 * 1024;

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
    await spawnAsync("ffmpeg", ["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k", "-y", outputPath]);
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

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

  // PRIMARY: whisper-1 with verbose_json — gives real timestamps
  try {
    const params: any = {
      file: await toFile(buffer, `audio.${format}`),
      model: "whisper-1",
      response_format: "verbose_json",
    };
    if (lang) params.language = lang;

    const response = await openai.audio.transcriptions.create(params) as any;

    if (!response?.text?.trim()) throw new Error("Empty response from whisper-1");

    const rawSegments: Array<{ start: number; end: number; text: string }> =
      (response.segments || []).map((s: any) => ({
        start: s.start + timeOffset,
        end: s.end + timeOffset,
        text: s.text,
      }));

    return {
      text: response.text,
      segments: rawSegments,
      duration: (response.duration || 0) + timeOffset,
    };
  } catch (primaryErr: any) {
    console.warn(`[transcription] whisper-1 failed (${primaryErr?.message}), trying gpt-4o-mini-transcribe`);
  }

  // FALLBACK: gpt-4o-mini-transcribe — no timestamps but reliable transcription
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

  if (buf.length > MAX_CHUNK_BYTES) {
    buf = await compressAudio(buf, format);
    fmt = "mp3";
  }

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

  const result = await transcribeChunk(buf, fmt, language, 0);
  return {
    text: result.text,
    srtContent: buildSrt(result.segments),
    vttContent: buildVtt(result.segments),
    duration: result.duration,
    segments: result.segments,
  };
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
