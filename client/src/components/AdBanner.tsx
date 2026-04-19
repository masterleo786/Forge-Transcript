import { ExternalLink, X } from "lucide-react";
import { useState } from "react";

interface AdBannerProps {
  slot?: "top" | "bottom" | "sidebar";
  className?: string;
}

/**
 * Ad placeholder component.
 * In production: replace the inner div with your Google AdSense <ins> tag.
 * Instructions: https://adsense.google.com/ → Create ad unit → copy the code here.
 */
export function AdBanner({ slot = "top", className = "" }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // Sidebar variant — narrower
  if (slot === "sidebar") {
    return (
      <div className={`relative rounded-xl border border-white/5 bg-white/3 overflow-hidden ${className}`}>
        <div className="absolute top-1.5 right-1.5">
          <button onClick={() => setDismissed(true)} className="text-muted-foreground/40 hover:text-muted-foreground p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2 min-h-[120px]">
          {/* ── Replace this block with your Google AdSense <ins> tag ── */}
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Advertisement</p>
          <p className="text-xs text-muted-foreground/60">Ad space · 160×600</p>
          <a
            href="/pricing"
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            Go ad-free <ExternalLink className="w-3 h-3" />
          </a>
          {/* ─────────────────────────────────────────────────────────── */}
        </div>
      </div>
    );
  }

  // Banner variant (top / bottom)
  return (
    <div className={`relative rounded-xl border border-white/5 bg-white/3 overflow-hidden ${className}`}>
      <div className="absolute top-2 right-2">
        <button onClick={() => setDismissed(true)} className="text-muted-foreground/40 hover:text-muted-foreground p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between px-6 py-3 min-h-[64px]">
        {/* ── Replace this block with your Google AdSense <ins> tag ── */}
        <div className="flex items-center gap-4">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Advertisement</p>
          <p className="text-xs text-muted-foreground/50">728×90 banner slot — paste your AdSense code here</p>
        </div>
        <a
          href="/pricing"
          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          Remove ads <ExternalLink className="w-3 h-3" />
        </a>
        {/* ─────────────────────────────────────────────────────────── */}
      </div>
    </div>
  );
}
