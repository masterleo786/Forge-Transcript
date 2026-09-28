import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import path from "path";

export const ffmpegBinary = ffmpegStatic || "ffmpeg";
export const ffprobeBinary = ffprobeStatic.path;

// yt-dlp looks up ffmpeg and ffprobe by executable name. Add both bundled
// binary directories to PATH so this works in published containers too.
const bundledToolDirectories = [
  path.dirname(ffmpegBinary),
  path.dirname(ffprobeBinary),
].filter(Boolean);

if (bundledToolDirectories.length) {
  const currentPath = process.env.PATH || "";
  process.env.PATH = [...bundledToolDirectories, currentPath].filter(Boolean).join(path.delimiter);
}