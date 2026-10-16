import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicMediaUrl } from "./mediaExtractor";
import { detectMediaPlatformFromUrl } from "@shared/media-platform";

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
