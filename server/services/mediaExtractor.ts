import youtubedl from "youtube-dl-exec";
import { Buffer } from "node:buffer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

export async function extractMediaFromUrl(url: string): Promise<{ buffer: Buffer; format: string; platform: string; title?: string }> {
  let platform = "unknown";
  if (url.includes("facebook.com") || url.includes("fb.watch")) platform = "facebook";
  else if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "youtube";
  else if (url.includes("instagram.com")) platform = "instagram";
  else if (url.includes("tiktok.com")) platform = "tiktok";

  const tempPath = path.join(os.tmpdir(), `dl-${crypto.randomUUID()}.mp3`);

  try {
    // Download audio using youtube-dl-exec
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: tempPath,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
    });

    const buffer = await fs.readFile(tempPath);
    
    let title = "Video from " + platform;
    try {
        const info = await youtubedl(url, { dumpJson: true });
        if (typeof info === 'object' && info !== null && 'title' in info) {
            title = String((info as any).title);
        }
    } catch(e) {
        // ignore metadata errors
    }
    
    return { buffer, format: "mp3", platform, title };
  } catch (error: any) {
    console.error("Error extracting media:", error);
    let errorMsg = "Failed to extract media from this URL.";
    if (error.message && (error.message.includes("Private video") || error.message.includes("Sign in"))) {
       errorMsg = "This video is private, restricted, or requires login. Please upload the video or audio file directly for transcription.";
    } else if (platform === "facebook") {
       errorMsg = "Could not retrieve this Facebook video. It may be private or restricted. Please upload the video or audio file directly for transcription.";
    }
    throw new Error(errorMsg);
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
