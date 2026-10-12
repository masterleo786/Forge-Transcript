import { useRoute } from "wouter";
import { useTranscript } from "@/hooks/use-transcripts";
import { Link } from "wouter";
import { ArrowLeft, Copy, Download, Link2, Clock, Globe, Type, Zap, FileText, Subtitles } from "lucide-react";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { AdBanner } from "@/components/AdBanner";
import { AppHeader } from "@/components/AppHeader";
import { useUsage } from "@/hooks/use-auth";
import { saveAs } from "file-saver";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Parse SRT into segments ──────────────────────────────────────────────────
function parseSrt(srt: string): Array<{ start: string; end: string; text: string }> {
  const blocks = srt.trim().split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const timeLine = lines.find((l) => l.includes("-->")) || "";
    const [start, end] = timeLine.split("-->").map((t) => t.trim());
    const text = lines.filter((l) => l && !l.match(/^\d+$/) && !l.includes("-->")).join(" ");
    return { start, end, text };
  }).filter((s) => s.text);
}

function formatSrtTime(t: string): string {
  if (!t) return "";
  // 00:00:05,123 → 0:05
  const [hms] = t.split(",");
  const parts = hms.split(":");
  const h = parseInt(parts[0] || "0");
  const m = parseInt(parts[1] || "0");
  const s = parseInt(parts[2] || "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── VTT from SRT ─────────────────────────────────────────────────────────────
function srtToVtt(srt: string): string {
  return "WEBVTT\n\n" + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}

function languageLabel(language: string | null | undefined): string {
  if (!language || language === "auto") return "Auto-detected (original language)";
  if (language === "ur-roman") return "Roman Urdu";
  if (language === "ur") return "Urdu";
  if (language === "hi") return "Hindi";
  return language.toUpperCase();
}

export default function TranscriptDetail() {
  const [, params] = useRoute("/transcript/:id");
  const id = parseInt(params?.id || "0");
  const { data: transcript, isLoading, error } = useTranscript(id);
  const { data: usage } = useUsage();
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"plain" | "timestamped">("plain");

  const showAds = !usage || usage.plan === "free" || usage.plan === "guest";
  const hasSrt = true;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="p-8">
          <Link href="/" className="text-primary hover:underline flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" /> Back Home
          </Link>
          <div className="glass-card p-10 text-center max-w-lg mx-auto rounded-2xl">
            <h2 className="text-2xl font-bold mb-2">Transcript Not Found</h2>
            <p className="text-muted-foreground">The requested transcript does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const showProcessingPanel =
    transcript.status === "pending" ||
    transcript.status === "processing" ||
    transcript.status === "failed";
  const srtSegments = transcript.srtContent ? parseSrt(transcript.srtContent) : [];
  const hasTimestamps = srtSegments.length > 0;

  const handleCopy = () => {
    if (transcript.content) {
      navigator.clipboard.writeText(transcript.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!transcript.content) return;
    saveAs(new Blob([transcript.content], { type: "text/plain;charset=utf-8" }), `transcript-${transcript.id}.txt`);
  };

  const handleDownloadSrt = () => {
    if (!transcript.srtContent) return;
    saveAs(new Blob([transcript.srtContent], { type: "text/plain;charset=utf-8" }), `transcript-${transcript.id}.srt`);
  };

  const handleDownloadVtt = () => {
    if (!transcript.srtContent) return;
    const vtt = srtToVtt(transcript.srtContent);
    saveAs(new Blob([vtt], { type: "text/vtt;charset=utf-8" }), `transcript-${transcript.id}.vtt`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />

      {/* Page header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/5 pt-4 pb-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors" data-testid="link-back">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-display font-semibold flex items-center gap-3" data-testid="text-transcript-title">
                {transcript.title || "Processing Media…"}
                {transcript.status === "complete" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                    Complete
                  </span>
                )}
              </h1>
              {transcript.originalUrl && (
                <a href={transcript.originalUrl} target="_blank" rel="noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                  <Link2 className="w-3 h-3" /> Original Source
                </a>
              )}
            </div>
          </div>

          {transcript.status === "complete" && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleCopy} data-testid="button-copy"
                className="px-4 py-2 bg-card border border-white/10 hover:bg-white/5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleDownloadTxt} data-testid="button-download-txt"
                className="px-4 py-2 bg-card border border-white/10 hover:bg-white/5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                <Download className="w-4 h-4" /> TXT
              </button>

              {/* VTT — free for everyone */}
              {transcript.srtContent && (
                <button onClick={handleDownloadVtt} data-testid="button-download-vtt"
                  className="px-4 py-2 bg-card border border-white/10 hover:bg-white/5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                  <FileText className="w-4 h-4" /> VTT
                </button>
              )}

              {/* SRT — free for everyone */}
              {transcript.srtContent && hasSrt ? (
                <button onClick={handleDownloadSrt} data-testid="button-download-srt"
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                  <Download className="w-4 h-4" /> SRT
                </button>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">
          {showProcessingPanel ? (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-8">
              <ProcessingSteps transcript={transcript} />
            </motion.div>
          ) : (
            <motion.div key="complete" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Metadata</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4" /> Platform</span>
                      <span className="flex items-center gap-2 font-medium capitalize">
                        <PlatformIcon platform={transcript.platform} className="w-4 h-4" />
                        {transcript.platform || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Duration</span>
                      <span className="font-medium">
                        {transcript.duration
                          ? `${Math.floor(transcript.duration / 60)}m ${transcript.duration % 60}s`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Type className="w-4 h-4" /> Words</span>
                      <span className="font-medium">{transcript.wordCount?.toLocaleString() || "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4" /> Language</span>
                      <span className="font-medium text-right">{languageLabel(transcript.language)}</span>
                    </div>
                    {hasTimestamps && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><Subtitles className="w-4 h-4" /> Segments</span>
                        <span className="font-medium">{srtSegments.length.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {showAds && <AdBanner slot="sidebar" />}

                {transcript.summary && (
                  <div className="glass-card rounded-2xl p-6 bg-primary/5 border-primary/20">
                    <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                      <Zap className="w-5 h-5" /> AI Summary
                    </h3>
                    <p className="text-white/80 leading-relaxed text-sm">{transcript.summary}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Transcript */}
              <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col" style={{ minHeight: "400px" }}>
                <div className="p-4 border-b border-white/10 bg-black/20 rounded-t-2xl flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg shrink-0">Full Transcript</h3>
                  <div className="flex items-center gap-2 ml-auto">
                    {/* View toggle — only show if we have timestamps */}
                    {hasTimestamps && (
                      <div className="flex items-center bg-black/30 rounded-lg p-0.5 text-xs font-medium">
                        <button onClick={() => setView("plain")}
                          className={`px-3 py-1.5 rounded-md transition-colors ${view === "plain" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                          Plain
                        </button>
                        <button onClick={() => setView("timestamped")}
                          className={`px-3 py-1.5 rounded-md transition-colors ${view === "timestamped" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                          Timestamped
                        </button>
                      </div>
                    )}
                    {transcript.content && (
                      <button onClick={handleCopy} data-testid="button-copy-inline"
                        className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded hover:bg-white/5">
                        <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy all"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-black/10 rounded-b-2xl" style={{ maxHeight: "70vh" }}
                  data-testid="text-transcript-content">
                  {transcript.content ? (
                    <AnimatePresence mode="wait">
                      {view === "plain" || !hasTimestamps ? (
                        <motion.div key="plain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="prose prose-invert max-w-none text-white/90 leading-loose select-text">
                          {transcript.content.split("\n").map((para, i) =>
                            para.trim() ? <p key={i} className="mb-4">{para}</p> : null
                          )}
                        </motion.div>
                      ) : (
                        <motion.div key="timestamped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-2">
                          {srtSegments.map((seg, i) => (
                            <div key={i} className="flex gap-3 group hover:bg-white/3 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                              <span className="text-xs text-primary/70 font-mono mt-0.5 shrink-0 w-10 text-right select-none">
                                {formatSrtTime(seg.start)}
                              </span>
                              <p className="text-white/85 leading-relaxed text-sm flex-1 select-text">{seg.text}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground italic">
                      Transcript content is empty.
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
