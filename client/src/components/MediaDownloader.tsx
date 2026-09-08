import { useState } from "react";
import { AlertCircle, Download, Film, Loader2, Music2 } from "lucide-react";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";

type DownloadFormat = "mp4" | "mp3";
type DownloadQuality = "best" | "1080" | "720" | "480";

function filenameFromResponse(response: Response, format: DownloadFormat): string {
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] || `download.${format}`;
}

export function MediaDownloader() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("mp4");
  const [quality, setQuality] = useState<DownloadQuality>("best");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isDownloading) return;

    setError("");
    setIsDownloading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, format, quality }),
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download this media.");
      }
      const blob = await response.blob();
      saveAs(blob, filenameFromResponse(response, format));
    } catch (downloadError: any) {
      setError(downloadError?.message || "Unable to download this media.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <form onSubmit={handleDownload} className="w-full space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-primary font-semibold">
          <Download className="w-5 h-5" /> Download public media
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a public link and save it as MP4 video or MP3 audio.
        </p>
      </div>

      <div className={`relative flex items-center transition-all rounded-2xl ${isDownloading ? "opacity-70" : ""}`}>
        <Download className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a public video link…"
          data-testid="input-download-url"
          className="w-full py-5 pl-12 pr-36 bg-card/40 border-2 border-white/10 rounded-2xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-card/80 transition-all"
          disabled={isDownloading}
        />
        <button
          type="submit"
          disabled={!url.trim() || isDownloading}
          data-testid="button-download-media"
          className="absolute right-2 top-2 bottom-2 px-5 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-4 h-4" /> Download</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([
          { value: "mp4" as const, label: "MP4 Video", note: "Best available video", icon: Film },
          { value: "mp3" as const, label: "MP3 Audio", note: "Audio only", icon: Music2 },
        ]).map((option) => {
          const Icon = option.icon;
          const selected = format === option.value;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => setFormat(option.value)}
              disabled={isDownloading}
              className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
            >
              <div className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4 text-primary" /> {option.label}</div>
              <p className="text-xs text-muted-foreground mt-1">{option.note}</p>
            </button>
          );
        })}
      </div>

      <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Video quality</span>
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value as DownloadQuality)}
          disabled={isDownloading || format === "mp3"}
          className="bg-card border border-white/10 rounded-lg px-3 py-2 text-foreground disabled:opacity-50"
          data-testid="select-download-quality"
        >
          <option value="best">Best available</option>
          <option value="1080">Up to 1080p</option>
          <option value="720">Up to 720p</option>
          <option value="480">Up to 480p</option>
        </select>
      </label>

      <p className="text-xs text-muted-foreground text-center">
        Public links only · single video, up to 250 MB · use content you own or have permission to download.
      </p>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Download failed</p>
              <p className="text-sm mt-1 text-white/80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}