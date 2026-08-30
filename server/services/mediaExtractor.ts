import youtubedl from "youtube-dl-exec";
import { Buffer } from "node:buffer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

export async function extractMediaFromUrl(url: string): Promise<{ buffer: Buffer; format: string; platform: string; title?: string }> {
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
      noCheckCertificate: true,
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

    let errorMsg = "Could not download this video. The URL may be private, geo-restricted, or unsupported.";

    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("private") || msg.includes("sign in") || msg.includes("login")) {
      errorMsg = "This video is private or requires login. Please download and upload the file directly instead.";
    } else if (msg.includes("not available") || msg.includes("unavailable")) {
      errorMsg = "This video is unavailable or has been removed.";
    } else if (platform === "facebook") {
      errorMsg = "Could not download this Facebook video — it may be private or restricted. Try uploading the file directly.";
    } else if (platform === "instagram") {
      errorMsg = "Could not download this Instagram video — it may be private. Try uploading the file directly.";
    } else if (platform === "kuaishou") {
      errorMsg = "Kuaishou/Kwai links need a supported public resolver. Please upload the video file directly for now.";
    }

    throw new Error(errorMsg);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}
