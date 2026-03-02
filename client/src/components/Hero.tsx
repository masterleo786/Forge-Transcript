import { motion } from "framer-motion";
import { ShieldCheck, Zap, FileText } from "lucide-react";

export function Hero() {
  return (
    <div className="relative py-20 lg:py-32 overflow-hidden flex flex-col items-center text-center px-4">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8"
      >
        <ShieldCheck className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white/80 tracking-wide">
          Facebook-first support guaranteed
        </span>
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 max-w-4xl leading-tight"
      >
        Turn public videos into <br className="hidden md:block"/>
        <span className="text-gradient">clean transcripts</span> in seconds.
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 font-sans"
      >
        TranscriptForge extracts audio from Facebook, YouTube, TikTok, or your uploaded files, generating highly accurate transcripts and summaries instantly.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap justify-center gap-8 text-sm text-white/60 font-medium"
      >
        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/> AI Summaries</div>
        <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400"/> SRT & TXT Exports</div>
        <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-400"/> Multi-platform</div>
      </motion.div>
    </div>
  );
}
