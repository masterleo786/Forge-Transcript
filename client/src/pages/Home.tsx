import { useState } from "react";
import { Link } from "wouter";
import { UrlIngestion } from "@/components/UrlIngestion";
import { FileIngestion } from "@/components/FileIngestion";
import { MediaDownloader } from "@/components/MediaDownloader";
import { Dashboard } from "@/components/Dashboard";
import { AppHeader } from "@/components/AppHeader";
import { AdBanner } from "@/components/AdBanner";
import { motion } from "framer-motion";
import { useUser, useUsage } from "@/hooks/use-auth";
import {
  Zap, Facebook, Youtube, Instagram, Globe, Crown, AlertTriangle, Download,
  Globe2, Clock, DollarSign, Languages, FileVideo, CheckCircle2,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";

function Hero() {
  return (
    <div className="text-center py-14 md:py-20 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
          <Zap className="w-3.5 h-3.5" /> AI speech transcription across supported languages
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-4">
          Transcribe any video
          <br />
          <span className="text-primary">in seconds</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-8">
          Paste a public URL or upload a file. Follow the job as it runs and view or download the finished transcript.
        </p>

        {/* Platform badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { icon: <Facebook className="w-4 h-4" />, label: "Facebook", color: "text-blue-400" },
            { icon: <Youtube className="w-4 h-4" />, label: "YouTube", color: "text-red-400" },
            { icon: <Instagram className="w-4 h-4" />, label: "Instagram", color: "text-pink-400" },
            { icon: <SiTiktok className="w-4 h-4" />, label: "TikTok", color: "text-white" },
            { icon: <Globe className="w-4 h-4" />, label: "File upload", color: "text-muted-foreground" },
          ].map((p) => (
            <span key={p.label}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm ${p.color}`}>
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonStrip() {
  const items = [
    {
      icon: <DollarSign className="w-5 h-5 text-green-400" />,
      title: "8× cheaper than competitors",
      desc: "Priced for everyone — not just those who can afford $20/mo",
    },
    {
      icon: <Languages className="w-5 h-5 text-blue-400" />,
      title: "70+ languages",
      desc: "Urdu, Chinese, Hindi, Arabic & more",
    },
    {
      icon: <FileVideo className="w-5 h-5 text-purple-400" />,
      title: "Long recordings",
      desc: "File audio is split into smaller transcription segments, including 3-hour recordings",
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      title: "Automatic status updates",
      desc: "The transcript page refreshes while a job is processing",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-4 mb-12 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.title} className="glass-card rounded-xl p-4 flex flex-col gap-2 border border-white/5 hover:border-white/10 transition-colors">
            <div className="p-2 bg-white/5 rounded-lg w-fit">{item.icon}</div>
            <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageLimitBanner({ used, limit, plan }: { used: number; limit: number; plan: string }) {
  const remaining = limit - used;
  if (remaining > 1 || plan !== "free") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 px-5 py-3 rounded-xl border flex items-center gap-3 text-sm ${
        remaining === 0
          ? "bg-destructive/10 border-destructive/30 text-red-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
      }`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {remaining === 0 ? (
        <>
          <span className="flex-1">You've used all {limit} free transcripts this period.</span>
          <Link href="/pricing" className="flex items-center gap-1 font-semibold hover:underline shrink-0">
            <Crown className="w-3.5 h-3.5" /> Upgrade
          </Link>
        </>
      ) : (
        <>
          <span className="flex-1">1 free transcript remaining this period.</span>
          <Link href="/pricing" className="flex items-center gap-1 font-semibold hover:underline shrink-0">
            <Crown className="w-3.5 h-3.5" /> Upgrade for more
          </Link>
        </>
      )}
    </motion.div>
  );
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<"transcribe" | "download">("transcribe");
  const [activeTab, setActiveTab] = useState<"url" | "file">("url");
  const { data: user } = useUser();
  const { data: usage } = useUsage();

  const showAds = !user || usage?.plan === "free";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {showAds && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <AdBanner slot="top" />
        </div>
      )}

      <main className="container mx-auto px-4 pt-6">
        <Hero />

        {/* Usage warning */}
        {usage && (
          <div className="max-w-2xl mx-auto w-full">
            <UsageLimitBanner used={usage.used} limit={usage.limit} plan={usage.plan} />
          </div>
        )}

        {/* Input card */}
        <div className="max-w-2xl mx-auto w-full -mt-2 relative z-20">
          <div className="bg-card/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl mb-8">
            <div className="flex p-1 bg-black/20 rounded-2xl mb-3">
              <button
                onClick={() => setActiveTool("transcribe")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTool === "transcribe" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                data-testid="tab-transcribe"
              >
                Transcribe
              </button>
              <button
                onClick={() => setActiveTool("download")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTool === "download" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                data-testid="tab-download"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
            {activeTool === "transcribe" && (
            <div className="flex p-1 bg-black/20 rounded-2xl mb-6">
              <button
                onClick={() => setActiveTab("url")}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === "url"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                data-testid="tab-url"
              >
                Paste Public URL
              </button>
              <button
                onClick={() => setActiveTab("file")}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === "file"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                data-testid="tab-file"
              >
                Upload File
              </button>
            </div>
            )}

            <p className="px-3 mb-3 text-center text-xs text-muted-foreground">
              {activeTool === "transcribe"
                ? "Transcribe turns speech into written text."
                : "Download saves the original public video or audio file."}
            </p>

            <div className="p-2 md:p-4">
              <motion.div
                key={`${activeTool}-${activeTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {activeTool === "download" ? <MediaDownloader /> : activeTab === "url" ? <UrlIngestion /> : <FileIngestion />}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Competitive comparison strip */}
        <ComparisonStrip />

        <Dashboard />

        {showAds && (
          <div className="max-w-4xl mx-auto pb-12">
            <AdBanner slot="bottom" />
          </div>
        )}
      </main>
    </div>
  );
}
