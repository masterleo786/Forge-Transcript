import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertPublicMediaUrl, limitVideoHeight } from "./mediaExtractor";
import { ffmpegBinary, ffprobeBinary } from "./mediaTools";
import { detectMediaPlatformFromUrl } from "@shared/media-platform";

function runTool(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data: string) => { stdout += data; });
    child.stderr.on("data", (data: string) => { stderr += data; });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(-800)}`));
    });
    child.on("error", reject);
  });
}

test("enforces selected maximum resolution and does not upscale smaller sources", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "download-quality-test-"));
  const sourcePath = path.join(tempDir, "source.mp4");
  let scaledPath: string | undefined;

  try {
    await runTool(ffmpegBinary, [
      "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "color=c=blue:s=720x1280:r=24:d=1",
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
      "-t", "1",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-y", sourcePath,
    ]);

    scaledPath = await limitVideoHeight(sourcePath, "480");
    assert.notEqual(scaledPath, sourcePath);
    const scaledHeight = Number((await runTool(ffprobeBinary, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=height",
      "-of", "default=noprint_wrappers=1:nokey=1",
      scaledPath,
    ])).trim());
    assert.equal(scaledHeight, 480);
    assert.equal(await limitVideoHeight(scaledPath, "720"), scaledPath);
  } finally {
    if (scaledPath && scaledPath !== sourcePath) {
      await rm(scaledPath, { force: true });
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("detects supported providers from exact hostnames and their subdomains", () => {
  const cases: Array<[string, string]> = [
    ["https://m.facebook.com/reel/123", "facebook"],
    ["https://fb.watch/abc", "facebook"],
    ["https://youtu.be/video-id", "youtube"],
    ["https://www.youtube.com/shorts/video-id", "youtube"],
    ["https://www.instagram.com/reel/123", "instagram"],
    ["https://vm.tiktok.com/abc", "tiktok"],
    ["https://www.rednote.com/explore/123", "rednote"],
    ["https://xhslink.com/o/abc", "rednote"],
    ["https://v.kuaishou.com/abc", "kuaishou"],
    ["https://www.kwai.com/video/abc", "kuaishou"],
  ];
  for (const [url, expected] of cases) {
    assert.equal(detectMediaPlatformFromUrl(url), expected, url);
  }
});

test("does not identify a provider from text in an unrelated hostname or path", () => {
  assert.equal(detectMediaPlatformFromUrl("https://youtube.com.attacker.example/video"), "unknown");
  assert.equal(detectMediaPlatformFromUrl("https://example.com/youtube.com/video"), "unknown");
});

test("rejects malformed URLs before media extraction", async () => {
  await assert.rejects(
    assertPublicMediaUrl("not a URL"),
    { message: "Enter a valid public video URL." },
  );
});

test("rejects non-HTTP protocols", async () => {
  await assert.rejects(
    assertPublicMediaUrl("file:///etc/passwd"),
    { message: "Only public HTTP and HTTPS video URLs are supported." },
  );
});

test("rejects loopback and private IPv4 URLs", async (t) => {
  for (const url of [
    "http://localhost/video",
    "http://127.0.0.1/video",
    "http://10.1.2.3/video",
    "http://172.16.0.1/video",
    "http://192.168.1.1/video",
  ]) {
    await t.test(url, async () => {
      await assert.rejects(
        assertPublicMediaUrl(url),
        { message: "Local and private network URLs are not allowed." },
      );
    });
  }
});

test("rejects local network hostnames", async () => {
  await assert.rejects(
    assertPublicMediaUrl("http://printer.local/video"),
    { message: "Local and private network URLs are not allowed." },
  );
});
