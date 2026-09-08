import express, { type Express, type Request, type Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { transcribeAudio, generateSummary, transliterateToRomanUrdu } from "./services/transcription";
import { assertPublicMediaUrl, detectMediaPlatform, downloadMediaFromUrl, extractMediaFromUrl } from "./services/mediaExtractor";
import { ensureCompatibleFormat } from "./replit_integrations/audio/client";
import { PLAN_LIMITS, type UserPlan } from "@shared/schema";

// ─── Multer ──────────────────────────────────────────────────────────────────

const uploadDir = path.join(os.tmpdir(), "transcript-uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB — supports 3+ hour videos
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkUsageLimit(req: Request, res: Response): Promise<boolean> {
  const user = req.user as any;
  if (!user) {
    // Keep the guest allowance server-side as well as in the UI.
    const session = (req as any).session;
    if ((session?.guestTranscriptsUsed || 0) >= 2) {
      res.status(403).json({ message: "Guest limit reached. Create a free account to continue.", upgradeRequired: true });
      return false;
    }
    return true;
  }
  await storage.resetMonthlyUsageIfNeeded(user.id);
  const plan = (user.plan || "free") as UserPlan;
  const limits = PLAN_LIMITS[plan];
  const used = await storage.getTranscriptCountThisMonth(user.id);
  if (used >= limits.transcriptsPerMonth) {
    res.status(403).json({
      message: "Monthly transcript limit reached",
      plan,
      limit: limits.transcriptsPerMonth,
      used,
      upgradeRequired: true,
    });
    return false;
  }
  return true;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Transcripts ────────────────────────────────────────────────────────────

  app.get(api.transcripts.list.path, async (req, res) => {
    try {
      const user = req.user as any;
      const allTranscripts = await storage.getTranscripts(user?.id);
      const guestIds = ((req as any).session?.guestTranscriptIds || []) as number[];
      const transcripts = user?.id
        ? allTranscripts
        : allTranscripts.filter((transcript) => guestIds.includes(transcript.id));
      res.json(transcripts);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.transcripts.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format" });
      const transcript = await storage.getTranscript(id);
      if (!transcript) return res.status(404).json({ message: "Transcript not found" });
      const user = req.user as any;
      const guestIds = (((req as any).session?.guestTranscriptIds || []) as number[]);
      if (user?.id ? transcript.userId !== user.id : !guestIds.includes(id)) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      res.json(transcript);
    } catch (error) {
      console.error("Error fetching transcript:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.transcripts.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format" });
      const transcript = await storage.getTranscript(id);
      if (!transcript) return res.status(404).json({ message: "Transcript not found" });
      const user = req.user as any;
      const guestIds = (((req as any).session?.guestTranscriptIds || []) as number[]);
      if (user?.id ? transcript.userId !== user.id : !guestIds.includes(id)) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      await storage.deleteTranscript(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transcript:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Create from URL ────────────────────────────────────────────────────────

  app.post(api.transcripts.createFromUrl.path, async (req, res) => {
    try {
      const input = api.transcripts.createFromUrl.input.parse(req.body);
      const allowed = await checkUsageLimit(req, res);
      if (!allowed) return;

      const platform = detectMediaPlatform(input.url);
      const user = req.user as any;

      const transcript = await storage.createTranscript({
        title: `Video from ${platform}`,
        originalUrl: input.url,
        platform,
        language: input.language || "auto",
        userId: user?.id ?? null,
      });

      if (user?.id) await storage.incrementTranscriptUsage(user.id);
      else {
        const session = (req as any).session;
        session.guestTranscriptsUsed = (session.guestTranscriptsUsed || 0) + 1;
        session.guestTranscriptIds = [...(session.guestTranscriptIds || []), transcript.id];
      }

      res.status(201).json(transcript);

      const language = input.language && input.language !== "auto" ? input.language : undefined;
      processUrlTranscription(transcript.id, input.url, language).catch(err => {
        console.error("Background URL processing failed:", err);
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, field: error.errors[0].path.join(".") });
      }
      console.error("Error creating from URL:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Direct media download ──────────────────────────────────────────────────
  const activeDownloads = new Set<string>();
  app.post(api.downloads.create.path, async (req, res) => {
    let key = "";
    try {
      const input = api.downloads.create.input.parse(req.body);
      await assertPublicMediaUrl(input.url);
      key = `download:${(req as any).sessionID || req.ip}`;
      if (activeDownloads.has(key)) {
        return res.status(429).json({ message: "A download is already in progress. Please wait for it to finish." });
      }
      activeDownloads.add(key);

      const result = await downloadMediaFromUrl(input.url, input.format, input.quality);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Length", result.buffer.length);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("Cache-Control", "no-store");
      res.send(result.buffer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, field: error.errors[0].path.join(".") });
      }
      const status = error?.message?.includes("already in progress") ? 429 : 400;
      res.status(status).json({ message: error?.message || "Unable to download this media." });
    } finally {
      if (key) activeDownloads.delete(key);
    }
  });

  // ── Create from File ───────────────────────────────────────────────────────

  app.post(api.transcripts.createFromFile.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const allowed = await checkUsageLimit(req, res);
      if (!allowed) return;

      const user = req.user as any;

      const transcript = await storage.createTranscript({
        title: req.file.originalname,
        platform: "upload",
        language: req.body?.language || "auto",
        userId: user?.id ?? null,
      });

      if (user?.id) await storage.incrementTranscriptUsage(user.id);
      else {
        const session = (req as any).session;
        session.guestTranscriptsUsed = (session.guestTranscriptsUsed || 0) + 1;
        session.guestTranscriptIds = [...(session.guestTranscriptIds || []), transcript.id];
      }

      res.status(201).json(transcript);

      const fileLanguage = (req.body?.language && req.body.language !== "auto") ? req.body.language : undefined;
      processFileTranscription(transcript.id, req.file.path, req.file.mimetype, fileLanguage).catch(err => {
        console.error("Background file processing failed:", err);
      });

    } catch (error) {
      console.error("Error creating from file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Usage info ─────────────────────────────────────────────────────────────

  app.get("/api/usage", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ plan: "guest", used: 0, limit: 2 });
    const user = req.user as any;
    await storage.resetMonthlyUsageIfNeeded(user.id);
    const refreshed = await storage.getUserById(user.id);
    const plan = (refreshed?.plan || "free") as UserPlan;
    const limits = PLAN_LIMITS[plan];
    res.json({
      plan,
      used: refreshed?.transcriptsUsedThisMonth ?? 0,
      limit: limits.transcriptsPerMonth,
      hasAds: limits.hasAds,
      hasSrt: limits.hasSrt,
    });
  });

  return httpServer;
}

// ─── Background: URL ──────────────────────────────────────────────────────────

async function processUrlTranscription(id: number, url: string, language?: string) {
  try {
    await storage.updateTranscriptStatus(id, "processing");

    const { buffer: mediaBuffer, format, platform, title } = await extractMediaFromUrl(url);
    const { buffer: compatibleBuffer, format: compFormat } = await ensureCompatibleFormat(mediaBuffer);
    const { text: rawText, srtContent, duration: audioDuration } = await transcribeAudio(compatibleBuffer, compFormat, language);
    const text = language === "ur-roman" ? await transliterateToRomanUrdu(rawText) : rawText;
    const summary = await generateSummary(text);

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const duration = audioDuration > 0 ? Math.round(audioDuration) : Math.round((wordCount / 150) * 60);

    await storage.updateTranscriptResult(id, {
      title: title || "Video",
      platform,
      content: text,
      srtContent,
      summary,
      wordCount,
      duration,
      language: language || "auto",
    });

  } catch (error: any) {
    console.error(`URL Transcription error for ID ${id}:`, error);
    await storage.updateTranscriptStatus(id, "failed", error.message || "Failed to process video URL");
  }
}

// ─── Background: File ─────────────────────────────────────────────────────────

async function processFileTranscription(id: number, filePath: string, mimeType: string, language?: string) {
  try {
    await storage.updateTranscriptStatus(id, "processing");

    const fileBuffer = await fs.readFile(filePath);
    await fs.unlink(filePath).catch(console.error);

    const { buffer: compatibleBuffer, format: compFormat } = await ensureCompatibleFormat(fileBuffer);
    const { text: rawText, srtContent, duration: audioDuration } = await transcribeAudio(compatibleBuffer, compFormat, language);
    const text = language === "ur-roman" ? await transliterateToRomanUrdu(rawText) : rawText;
    const summary = await generateSummary(text);

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const duration = audioDuration > 0 ? Math.round(audioDuration) : Math.round((wordCount / 150) * 60);

    await storage.updateTranscriptResult(id, {
      content: text,
      srtContent,
      summary,
      wordCount,
      duration,
      language: language || "auto",
    });

  } catch (error: any) {
    console.error(`File Transcription error for ID ${id}:`, error);
    await fs.unlink(filePath).catch(() => {});
    await storage.updateTranscriptStatus(id, "failed", error.message || "Failed to process audio file");
  }
}

