import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openai } from "../replit_integrations/audio/client";
import { ffmpegBinary } from "./mediaTools";
import { transcribeAudio, transcribeAudioFile } from "./transcription";

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (data: string) => { stderr += data; });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(-1000)}`));
    });
    child.on("error", reject);
  });
}

test("duration-splits a long small audio file and retains every segment result", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "transcription-test-"));
  const fixturePath = join(tempDir, "long-silence.wav");
  const transcriptionApi = openai.audio.transcriptions as any;
  const originalCreate = transcriptionApi.create;
  let callCount = 0;
  const modelsUsed: string[] = [];

  try {
    // 601 seconds of silence stays under the 20 MiB input-size threshold at
    // 16 kHz mono PCM, so this catches duration-based (not size-based) splitting.
    await run(ffmpegBinary, [
      "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono",
      "-t", "601",
      "-acodec", "pcm_s16le",
      "-y", fixturePath,
    ]);
    const fixture = await readFile(fixturePath);

    transcriptionApi.create = async (params: any) => {
      callCount += 1;
      modelsUsed.push(params.model);
      const label = `fixture chunk ${callCount}`;
      return {
        text: label,
        segments: [{ start: 0, end: 1, text: label }],
        duration: 1,
      };
    };

    const result = await transcribeAudio(fixture, "wav");

    assert.equal(callCount, 2, "both chunks should be sent to the transcription provider");
    assert.deepEqual(modelsUsed, ["gpt-4o-transcribe", "gpt-4o-transcribe"]);
    assert.equal(result.text, "fixture chunk 1 fixture chunk 2");
    assert.deepEqual(result.segments.map((segment) => segment.start), [0, 301]);
    assert.equal(result.duration, 601);
  } finally {
    transcriptionApi.create = originalCreate;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("processes a three-hour uploaded recording in 18 bounded audio segments", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "transcription-three-hour-test-"));
  const fixturePath = join(tempDir, "three-hour-silence.mp3");
  const transcriptionApi = openai.audio.transcriptions as any;
  const originalCreate = transcriptionApi.create;
  let callCount = 0;

  try {
    // A real three-hour MP3 exercises FFmpeg file-based chunking without
    // uploading the full media into memory or calling the paid AI endpoint.
    await run(ffmpegBinary, [
      "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono",
      "-t", "10800",
      "-c:a", "libmp3lame",
      "-b:a", "32k",
      "-y", fixturePath,
    ]);

    transcriptionApi.create = async (params: any) => {
      callCount += 1;
      assert.equal(params.model, "gpt-4o-transcribe");
      const label = `segment ${callCount}`;
      return {
        text: label,
        segments: [{ start: 0, end: 1, text: label }],
        duration: 1,
      };
    };

    const result = await transcribeAudioFile(fixturePath);

    assert.equal(callCount, 18, "the complete three-hour file should be split into 18 ten-minute calls");
    assert.equal(result.duration, 10800);
    assert.equal(result.text.split(" ").length, 36);
    assert.equal(result.segments.length, 18);
    const segmentStarts = result.segments.map((segment) => segment.start);
    const segmentInterval = segmentStarts[1] - segmentStarts[0];
    assert.ok(segmentInterval >= 600 && segmentInterval <= 601);
    assert.deepEqual(
      segmentStarts,
      Array.from({ length: 18 }, (_, index) => index * segmentInterval),
    );
    assert.ok(segmentStarts.at(-1)! < result.duration);
  } finally {
    transcriptionApi.create = originalCreate;
    await rm(tempDir, { recursive: true, force: true });
  }
});
