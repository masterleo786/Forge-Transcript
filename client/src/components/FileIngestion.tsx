import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileAudio, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSelector } from "./LanguageSelector";
import { useCreateFromFile } from "@/hooks/use-transcripts";
import { useLocation } from "wouter";

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

export function FileIngestion() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const createMutation = useCreateFromFile();
  const [, setLocation] = useLocation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".mov", ".webm", ".avi", ".mkv"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_BYTES,
  });

  const handleUpload = () => {
    if (!file) return;
    createMutation.mutate(
      { file, language },
      {
        onSuccess: (data) => {
          setFile(null);
          setLocation(`/transcript/${data.id}`);
        },
      }
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Language selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Transcript language:</span>
        <LanguageSelector value={language} onChange={setLanguage} className="flex-1 max-w-xs" />
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-primary/30 hover:bg-white/5"}
            ${isDragReject ? "border-destructive bg-destructive/5" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-full bg-card border border-white/5 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UploadCloud className={`w-8 h-8 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Drag & drop your file here</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Supports MP3, WAV, MP4, MOV, MKV and more — up to <strong className="text-white/70">500 MB</strong> (3+ hour videos).
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-6 relative overflow-hidden"
        >
          {createMutation.isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="font-medium animate-pulse">Uploading and starting transcription…</p>
              {file.size > 50 * 1024 * 1024 && (
                <p className="text-sm text-muted-foreground mt-2">Large file detected — may take a moment to upload</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileAudio className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{file.name}</p>
              <p className="text-muted-foreground text-sm">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button
              onClick={() => setFile(null)}
              disabled={createMutation.isPending}
              className="text-sm text-muted-foreground hover:text-white px-3 py-1 rounded hover:bg-white/10 transition-colors"
            >
              Change
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={createMutation.isPending}
            data-testid="button-upload"
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Generate Transcript
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {createMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Upload failed</p>
              <p className="text-sm mt-1 text-white/80">{createMutation.error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
