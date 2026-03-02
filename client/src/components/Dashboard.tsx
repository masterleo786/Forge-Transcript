import { useTranscripts, useDeleteTranscript } from "@/hooks/use-transcripts";
import { Link } from "wouter";
import { format } from "date-fns";
import { Clock, Loader2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { PlatformIcon } from "./ui/platform-icon";

export function Dashboard() {
  const { data: transcripts, isLoading } = useTranscripts();
  const deleteMutation = useDeleteTranscript();

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!transcripts || transcripts.length === 0) {
    return null; // Don't show anything if empty, let hero be focus
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-24 mb-20 px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display font-semibold">Recent Transcripts</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transcripts.map((t) => (
          <div key={t.id} className="group relative">
            <Link href={`/transcript/${t.id}`} className="block">
              <div className="glass-card rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/10 hover:border-primary/30">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <PlatformIcon platform={t.platform} />
                  </div>
                  {t.status === "complete" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                  {(t.status === "pending" || t.status === "processing") && <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
                  {t.status === "failed" && <AlertCircle className="w-5 h-5 text-red-400" />}
                </div>
                
                <h3 className="font-semibold text-lg line-clamp-1 mb-2 text-foreground group-hover:text-primary transition-colors">
                  {t.title || "Untitled Video"}
                </h3>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                  {t.summary || (t.status === "complete" ? t.content?.substring(0, 100) : "Processing in progress...")}
                </p>

                <div className="flex items-center gap-4 text-xs text-white/40 mt-auto pt-4 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown"}
                  </span>
                  {t.duration && (
                    <span>{Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, '0')}</span>
                  )}
                </div>
              </div>
            </Link>
            
            {/* Delete button appears on hover */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                if(confirm("Delete this transcript?")) deleteMutation.mutate(t.id);
              }}
              className="absolute top-4 right-4 p-2 bg-destructive/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-lg"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
