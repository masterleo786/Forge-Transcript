import youtubedl from "youtube-dl-exec";
import { Buffer } from "node:buffer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";

export type DownloadFormat = "mp4" | "mp3";
export type DownloadQuality = "best" | "1080" | "720" | "480";

const MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024;

export function detectMediaPlatform(url: string): string {
  const lowerUrl = url.toLowerCase();
  let platform = "unknown";
  if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) platform = "facebook";
  else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) platform = "youtube";
  else if (lowerUrl.includes("instagram.com")) platform = "instagram";
  else if (lowerUrl.includes("tiktok.com")) platform = "tiktok";
  else if (
    lowerUrl.includes("xiaohongshu.com") ||
    lowerUrl.includes("xhslink.com") ||
    lowerUrl.includes("rednote.com")
  ) platform = "rednote";
  else if (lowerUrl.includes("kuaishou.com") || lowerUrl.includes("kwai.com")) platform = "kuaishou";
  else platform = "unknown";
  return platform;
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe80") || normalized.startsWith("::ffff:127.");
}

export async function assertPublicMediaUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid public video URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only public HTTP and HTTPS video URLs are supported.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Local and private network URLs are not allowed.");
  }
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (addresses.some(({ address }) => isPrivateIp(address))) {
      throw new Error("Local and private network URLs are not allowed.");
    }
  } catch (error: any) {
    if (error?.message === "Local and private network URLs are not allowed.") throw error;
    throw new Error("This URL host could not be reached.");
  }
  return parsed;
}

function safeFilename(name: string, extension: DownloadFormat): string {
  const clean = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "download";
  return `${clean}.${extension}`;
}

function extractionError(platform: string, error: any): Error {
  const msg = (error?.message || "").toLowerCase();
  let errorMsg = "Could not download this media. The URL may be private, geo-restricted, or unsupported.";
  if (
    platform === "youtube" &&
    (msg.includes("not a bot") || msg.includes("confirm you") || msg.includes("captcha"))
  ) {
    errorMsg = "YouTube temporarily blocked this request with a bot check. Try another public video or upload the video file directly.";
  } else if (msg.includes("private") || msg.includes("sign in") || msg.includes("login")) {
    errorMsg = "This media is private or requires login. Only public links are supported.";
  } else if (msg.includes("not available") || msg.includes("unavailable")) {
    errorMsg = "This media is unavailable or has been removed.";
  } else if (msg.includes("larger than") || msg.includes("max-filesize")) {
    errorMsg = "This download is larger than the 250 MB limit.";
  } else if (msg.includes("audio codec") || msg.includes("no audio")) {
    errorMsg = "This media has no usable audio track. Choose MP4 video instead or use a file with audio.";
  } else if (platform === "facebook") {
    errorMsg = "This Facebook video may be private or restricted. Try a public link or upload the file directly.";
  } else if (platform === "instagram") {
    errorMsg = "This Instagram video may be private or restricted. Try a public link or upload the file directly.";
  } else if (platform === "kuaishou") {
    errorMsg = "Kuaishou/Kwai links need a supported public resolver. Upload the video file directly for now.";
  }
  return new Error(errorMsg);
}

export async function extractMediaFromUrl(url: string): Promise<{ buffer: Buffer; format: string; platform: string; title?: string }> {
  const platform = detectMediaPlatform(url);
  const tempPath = path.join(os.tmpdir(), `dl-${crypto.randomUUID()}.mp3`);

  try {
    // Single call: download audio + capture metadata (avoids fetching the video twice)
    const result = await youtubedl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,        // best quality
      format: "bestaudio/best",
      output: tempPath,
      noWarnings: true,
      noPlaylist: true,        // never grab playlists, only the single video
      printJson: true,         // get metadata in same call
      ...(platform === "youtube"
        ? { extractorArgs: "youtube:player_client=android" }
        : {}),
    } as any) as any;

    const buffer = await fs.readFile(tempPath);
    const title = result?.title || `Video from ${platform}`;

    return { buffer, format: "mp3", platform, title };
  } catch (error: any) {
    console.error("Error extracting media:", error?.message ?? error);
    throw extractionError(platform, error);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

export async function downloadMediaFromUrl(
  url: string,
  format: DownloadFormat,
  quality: DownloadQuality = "best",
): Promise<{ buffer: Buffer; contentType: string; filename: string; platform: string }> {
  const platform = detectMediaPlatform(url);
  const extension = format === "mp3" ? "mp3" : "mp4";
  const tempPath = path.join(os.tmpdir(), `download-${crypto.randomUUID()}.${extension}`);

  try {
    const heightFilter = quality === "best" ? "" : `[height<=${quality}]`;
    const options: Record<string, unknown> = {
      output: tempPath,
      noWarnings: true,
      noPlaylist: true,
      maxFilesize: "250M",
      printJson: true,
      format: format === "mp3"
        ? "bestaudio/best"
        : `bestvideo${heightFilter}[ext=mp4]+bestaudio[ext=m4a]/best${heightFilter}[ext=mp4]/best`,
      ...(format === "mp3"
        ? { extractAudio: true, audioFormat: "mp3", audioQuality: 0 }
        : { mergeOutputFormat: "mp4" }),
      ...(platform === "youtube"
        ? { extractorArgs: "youtube:player_client=android" }
        : {}),
    };
    const result = await youtubedl(url, options as any) as any;
    const buffer = await fs.readFile(tempPath);
    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      throw new Error("This download is larger than the 250 MB limit.");
    }
    const title = typeof result?.title === "string" ? result.title : `media-${platform}`;
    return {
      buffer,
      platform,
      filename: safeFilename(title, extension),
      contentType: format === "mp3" ? "audio/mpeg" : "video/mp4",
    };
  } catch (error: any) {
    console.error("Error downloading media:", error?.message ?? error);
    throw extractionError(platform, error);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}
