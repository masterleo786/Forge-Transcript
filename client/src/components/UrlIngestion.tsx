import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { PlatformIcon } from "./ui/platform-icon";
import { LanguageSelector } from "./LanguageSelector";
import { useCreateFromUrl } from "@/hooks/use-transcripts";
import { useLocation } from "wouter";

export function UrlIngestion() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("auto");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const createMutation = useCreateFromUrl();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!url) { setDetectedPlatform(null); return; }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) setDetectedPlatform("facebook");
    else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) setDetectedPlatform("youtube");
    else if (lowerUrl.includes("instagram.com")) setDetectedPlatform("instagram");
    else if (lowerUrl.includes("tiktok.com")) setDetectedPlatform("tiktok");
    else if (
      lowerUrl.includes("xiaohongshu.com") ||
      lowerUrl.includes("xhslink.com") ||
      lowerUrl.includes("rednote.com")
    ) setDetectedPlatform("rednote");
    else if (lowerUrl.includes("kuaishou.com") || lowerUrl.includes("kwai.com")) setDetectedPlatform("kuaishou");
    else setDetectedPlatform("unknown");
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { url: trimmed, language },
      {
        onSuccess: (data) => {
          setUrl("");
          setLocation(`/transcript/${data.id}`);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Language selector row */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Transcript language:</span>
        <LanguageSelector value={language} onChange={setLanguage} className="flex-1 max-w-xs" />
      </div>

      {/* URL input row */}
      <div className={`relative flex items-center transition-all duration-300 rounded-2xl ${createMutation.isPending ? "opacity-70 pointer-events-none" : ""}`}>
        <div className="absolute left-4 z-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {detectedPlatform ? (
              <motion.div
                key={detectedPlatform}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="bg-card p-1.5 rounded-md border border-white/10 shadow-sm"
              >
                <PlatformIcon platform={detectedPlatform} className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div key="default" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                <Link2 className="w-6 h-6 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted) setTimeout(() => setUrl(pasted.trim()), 0);
          }}
          placeholder="Paste public video link (YouTube, RedNote, TikTok…)"
          data-testid="input-url"
          className="w-full py-5 pl-16 pr-36 bg-card/40 border-2 border-white/10 rounded-2xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-card/80 transition-all backdrop-blur-sm"
          disabled={createMutation.isPending}
        />

        <button
          type="submit"
          disabled={!url.trim() || createMutation.isPending}
          data-testid="button-generate"
          className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Generate <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>

      <AnimatePresence>
        {createMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Unable to process URL</p>
              <p className="text-sm mt-1 text-white/80">{createMutation.error.message}</p>
              <p className="text-sm mt-2 text-white/50">If this video is private or restricted, use the file upload tab instead.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
