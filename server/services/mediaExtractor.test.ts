import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicMediaUrl } from "./mediaExtractor";

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
