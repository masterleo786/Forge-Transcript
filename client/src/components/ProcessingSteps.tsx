import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { TranscriptResponse } from "@shared/routes";

const steps = [
  { id: 1, label: "Detecting Platform & Validating URL" },
  { id: 2, label: "Extracting Media & Audio" },
  { id: 3, label: "Transcribing via AI" },
  { id: 4, label: "Generating Summary & Formatting" }
];

export function ProcessingSteps({ transcript }: { transcript: TranscriptResponse }) {
  // Simulate active step based on status/duration since creation (for visual effect)
  // In a real app with granular backend status, we'd map this directly.
  // Here we'll use a visual simulation that loops until complete or failed.
  
  // If failed, show failure state
  if (transcript.status === "failed") {
    return (
      <div className="glass-card rounded-2xl p-10 text-center border-destructive/20">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Circle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-2xl font-bold text-destructive mb-2">Processing Failed</h3>
        <p className="text-muted-foreground">{transcript.errorMessage || "An unknown error occurred while processing this media."}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-8 md:p-12 max-w-2xl mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <div className="w-20 h-20 bg-card border border-primary/30 rounded-2xl flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Forging Transcript...</h2>
        <p className="text-muted-foreground">This usually takes 1-3 minutes depending on media length.</p>
      </div>

      <div className="space-y-6 relative">
        {/* Connecting line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-white/5 z-0" />
        
        {steps.map((step, idx) => {
          // Fake progression logic for UI feeling
          const isComplete = idx < 2; // Simulate some steps are done
          const isActive = idx === 2;
          const isPending = idx > 2;

          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={step.id} 
              className={`flex items-center gap-4 relative z-10 ${isPending ? 'opacity-40' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isComplete ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                isActive ? 'bg-primary/20 text-primary border border-primary/50' : 
                'bg-card border border-white/10 text-white/20'
              }`}>
                {isComplete ? <CheckCircle2 className="w-5 h-5" /> : 
                 isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                 <span className="text-xs font-bold">{step.id}</span>}
              </div>
              <span className={`font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
