import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { transcribeAudio, generateSummary } from "./services/transcription";
import { extractMediaFromUrl } from "./services/mediaExtractor";
import { ensureCompatibleFormat } from "./replit_integrations/audio/client";

// Set up multer for file uploads
const uploadDir = path.join(os.tmpdir(), "transcript-uploads");
// Ensure directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({ 
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for audio/video files
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all transcripts
  app.get(api.transcripts.list.path, async (req, res) => {
    try {
      const transcripts = await storage.getTranscripts();
      res.json(transcripts);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get specific transcript
  app.get(api.transcripts.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const transcript = await storage.getTranscript(id);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      res.json(transcript);
    } catch (error) {
      console.error("Error fetching transcript:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete transcript
  app.delete(api.transcripts.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const transcript = await storage.getTranscript(id);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      
      await storage.deleteTranscript(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transcript:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create transcript from URL
  app.post(api.transcripts.createFromUrl.path, async (req, res) => {
    try {
      const input = api.transcripts.createFromUrl.input.parse(req.body);
      
      // Determine platform early for UI feedback
      let platform = "generic";
      if (input.url.includes("facebook.com") || input.url.includes("fb.watch")) platform = "facebook";
      else if (input.url.includes("youtube.com") || input.url.includes("youtu.be")) platform = "youtube";
      else if (input.url.includes("instagram.com")) platform = "instagram";
      else if (input.url.includes("tiktok.com")) platform = "tiktok";

      // 1. Create DB record as "pending"
      const transcript = await storage.createTranscript({
        title: `Video from ${platform}`,
        originalUrl: input.url,
        platform: platform,
      });

      // Return immediately so UI can show loading state
      res.status(201).json(transcript);

      // Start background processing
      processUrlTranscription(transcript.id, input.url).catch(err => {
        console.error("Background URL processing failed:", err);
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          field: error.errors[0].path.join('.'),
        });
      }
      console.error("Error creating from URL:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create transcript from file upload
  app.post(api.transcripts.createFromFile.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 1. Create DB record
      const transcript = await storage.createTranscript({
        title: req.file.originalname,
        platform: "upload",
      });

      // Return immediately so UI can show loading state
      res.status(201).json(transcript);

      // Start background processing
      processFileTranscription(transcript.id, req.file.path, req.file.mimetype).catch(err => {
        console.error("Background file processing failed:", err);
      });

    } catch (error) {
      console.error("Error creating from file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

// Background processing for URLs
async function processUrlTranscription(id: number, url: string) {
  try {
    await storage.updateTranscriptStatus(id, "processing");

    // Extract audio — get title and platform from the extractor
    const { buffer: mediaBuffer, format, platform, title } = await extractMediaFromUrl(url);

    // Convert to compatible format
    const { buffer: compatibleBuffer, format: compFormat } = await ensureCompatibleFormat(mediaBuffer);

    // Transcribe
    const transcriptText = await transcribeAudio(compatibleBuffer, compFormat);

    // Generate summary
    const summary = await generateSummary(transcriptText);

    // Estimate words and duration
    const wordCount = transcriptText.split(/\s+/).length;
    const duration = Math.round((wordCount / 150) * 60);

    // Save everything in one final write — this is what marks it "complete"
    await storage.updateTranscriptResult(id, {
      title: title || "Video",
      platform: platform,
      content: transcriptText,
      summary: summary,
      wordCount,
      duration,
      language: "en",
    });

  } catch (error: any) {
    console.error(`URL Transcription error for ID ${id}:`, error);
    await storage.updateTranscriptStatus(id, "failed", error.message || "Failed to process video URL");
  }
}

// Background processing for Files
async function processFileTranscription(id: number, filePath: string, mimeType: string) {
  try {
    await storage.updateTranscriptStatus(id, "processing");

    // Read file
    const fileBuffer = await fs.readFile(filePath);
    
    // Clean up uploaded file immediately
    await fs.unlink(filePath).catch(console.error);

    // Convert to compatible format
    const { buffer: compatibleBuffer, format: compFormat } = await ensureCompatibleFormat(fileBuffer);

    // Transcribe
    const transcriptText = await transcribeAudio(compatibleBuffer, compFormat);

    // Generate summary
    const summary = await generateSummary(transcriptText);

    // Estimate words and duration
    const wordCount = transcriptText.split(/\s+/).length;
    const duration = Math.round((wordCount / 150) * 60);

    // Save success
    await storage.updateTranscriptResult(id, {
      content: transcriptText,
      summary: summary,
      wordCount,
      duration,
      language: "en", 
      status: "complete"
    });

  } catch (error: any) {
    console.error(`File Transcription error for ID ${id}:`, error);
    // Cleanup if we failed before doing so
    await fs.unlink(filePath).catch(() => {});
    await storage.updateTranscriptStatus(id, "failed", error.message || "Failed to process audio file");
  }
}
