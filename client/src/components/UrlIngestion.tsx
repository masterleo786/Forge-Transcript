import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { PlatformIcon } from "./ui/platform-icon";
import { useCreateFromUrl } from "@/hooks/use-transcripts";
import { useLocation } from "wouter";

export function UrlIngestion() {
  const [url, setUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const createMutation = useCreateFromUrl();
  const [, setLocation] = useLocation();

  // Simple client-side platform detection for visual feedback
  useEffect(() => {
    if (!url) {
      setDetectedPlatform(null);
      return;
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) setDetectedPlatform("facebook");
    else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) setDetectedPlatform("youtube");
    else if (lowerUrl.includes("instagram.com")) setDetectedPlatform("instagram");
    else if (lowerUrl.includes("tiktok.com")) setDetectedPlatform("tiktok");
    else setDetectedPlatform("unknown");
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    createMutation.mutate({ url }, {
      onSuccess: (data) => {
        setLocation(`/transcript/${data.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full relative">
      <div className={`relative flex items-center transition-all duration-300 rounded-2xl ${createMutation.isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
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
              <motion.div
                key="default"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Link2 className="w-6 h-6 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste public video link (Facebook, YouTube, etc.)"
          className="w-full py-5 pl-16 pr-36 bg-card/40 border-2 border-white/10 rounded-2xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-card/80 transition-all backdrop-blur-sm"
          required
          disabled={createMutation.isPending}
        />

        <button
          type="submit"
          disabled={!url || createMutation.isPending}
          className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Generate <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {createMutation.isError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3 text-destructive-foreground/90"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Unable to process URL</p>
              <p className="text-sm mt-1">{createMutation.error.message}</p>
              <p className="text-sm mt-2 text-white/60">If this is a private or restricted video, please use the file upload option instead.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
