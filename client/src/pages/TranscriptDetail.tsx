import { useRoute } from "wouter";
import { useTranscript } from "@/hooks/use-transcripts";
import { Link } from "wouter";
import { ArrowLeft, Copy, Download, Link2, Clock, Globe, Type } from "lucide-react";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { saveAs } from "file-saver";
import { useState } from "react";
import { motion } from "framer-motion";

export default function TranscriptDetail() {
  const [, params] = useRoute("/transcript/:id");
  const id = parseInt(params?.id || "0");
  const { data: transcript, isLoading, error } = useTranscript(id);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Link href="/" className="text-primary hover:underline flex items-center gap-2 mb-8"><ArrowLeft className="w-4 h-4"/> Back Home</Link>
        <div className="glass-card p-10 text-center max-w-lg mx-auto rounded-2xl">
          <h2 className="text-2xl font-bold mb-2">Transcript Not Found</h2>
          <p className="text-muted-foreground">The requested transcript does not exist or an error occurred.</p>
        </div>
      </div>
    );
  }

  const isProcessing = transcript.status === "pending" || transcript.status === "processing";

  const handleCopy = () => {
    if (transcript.content) {
      navigator.clipboard.writeText(transcript.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!transcript.content) return;
    const blob = new Blob([transcript.content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `transcript-${transcript.id}.txt`);
  };

  const handleDownloadSrt = () => {
    if (!transcript.srtContent) return;
    const blob = new Blob([transcript.srtContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `transcript-${transcript.id}.srt`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 pt-6 pb-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-display font-semibold flex items-center gap-3">
                {transcript.title || "Processing Media..."}
                {transcript.status === 'complete' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                    Complete
                  </span>
                )}
              </h1>
              {transcript.originalUrl && (
                <a href={transcript.originalUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                  <Link2 className="w-3 h-3" /> Original Source
                </a>
              )}
            </div>
          </div>

          {!isProcessing && transcript.status === 'complete' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className="px-4 py-2 bg-card border border-white/10 hover:bg-white/5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              >
                <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
              </button>
              <button 
                onClick={handleDownloadTxt}
                className="px-4 py-2 bg-card border border-white/10 hover:bg-white/5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> TXT
              </button>
              {transcript.srtContent && (
                <button 
                  onClick={handleDownloadSrt}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                  <Download className="w-4 h-4" /> SRT
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {isProcessing || transcript.status === "failed" ? (
          <div className="mt-12">
            <ProcessingSteps transcript={transcript} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Metadata & Summary */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Metadata</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4"/> Platform</span>
                    <span className="flex items-center gap-2 font-medium capitalize">
                      <PlatformIcon platform={transcript.platform} className="w-4 h-4"/>
                      {transcript.platform || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/> Duration</span>
                    <span className="font-medium">
                      {transcript.duration ? `${Math.floor(transcript.duration / 60)}m ${transcript.duration % 60}s` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Type className="w-4 h-4"/> Words</span>
                    <span className="font-medium">{transcript.wordCount || "--"}</span>
                  </div>
                </div>
              </motion.div>

              {transcript.summary && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-6 bg-primary/5 border-primary/20"
                >
                  <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                    <Zap className="w-5 h-5" /> AI Summary
                  </h3>
                  <p className="text-white/80 leading-relaxed text-sm">
                    {transcript.summary}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right Column: Full Transcript */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 glass-card rounded-2xl flex flex-col h-[700px] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 bg-black/20">
                <h3 className="font-semibold text-lg">Full Transcript</h3>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                {transcript.content ? (
                  <div className="prose prose-invert max-w-none text-white/90 leading-loose">
                    {/* Simulated formatting: splitting by newlines for better reading */}
                    {transcript.content.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic">
                    Transcript content is empty.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

// Quick dummy icon for Zap since it wasn't imported in this file
function Zap(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
