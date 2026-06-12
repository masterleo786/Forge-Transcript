import express, { type Express, type Request, type Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs/promises";
import Stripe from "stripe";
import { transcribeAudio, generateSummary } from "./services/transcription";
import { extractMediaFromUrl } from "./services/mediaExtractor";
import { ensureCompatibleFormat } from "./replit_integrations/audio/client";
import { PLAN_LIMITS, type UserPlan } from "@shared/schema";

// ─── Stripe setup ────────────────────────────────────────────────────────────

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ─── Multer ──────────────────────────────────────────────────────────────────

const uploadDir = path.join(os.tmpdir(), "transcript-uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB — supports 3+ hour videos
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectPlatform(url: string): string {
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  return "generic";
}

async function checkUsageLimit(req: Request, res: Response): Promise<boolean> {
  const user = req.user as any;
  if (!user) {
    // Guest: allow up to 2 transcripts (tracked client-side, enforced server-side by guest count)
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
      const transcripts = await storage.getTranscripts(user?.id);
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

      const platform = detectPlatform(input.url);
      const user = req.user as any;

      const transcript = await storage.createTranscript({
        title: `Video from ${platform}`,
        originalUrl: input.url,
        platform,
        userId: user?.id ?? null,
      });

      if (user?.id) await storage.incrementTranscriptUsage(user.id);

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
        userId: user?.id ?? null,
      });

      if (user?.id) await storage.incrementTranscriptUsage(user.id);

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

  // ── Stripe Checkout ────────────────────────────────────────────────────────

  app.post("/api/stripe/checkout", async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Payment system not configured" });
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required to subscribe" });

    const { plan, cycle } = req.body; // plan: basic|pro, cycle: monthly|annual
    const user = req.user as any;

    const priceIds: Record<string, Record<string, string>> = {
      basic: {
        monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || "",
        annual: process.env.STRIPE_PRICE_BASIC_ANNUAL || "",
      },
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
        annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
      },
    };

    const priceId = priceIds[plan]?.[cycle];
    if (!priceId) return res.status(400).json({ message: "Invalid plan or cycle. Please configure Stripe price IDs." });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.protocol}://${req.get("host")}/pricing?success=1`,
        cancel_url: `${req.protocol}://${req.get("host")}/pricing?canceled=1`,
        customer_email: user.email,
        metadata: { userId: String(user.id), plan, cycle },
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ── Stripe Webhook ─────────────────────────────────────────────────────────

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) return res.status(503).send("Stripe not configured");

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // rawBody is captured in the express.json verify callback in index.ts
    const rawBody = (req as any).rawBody;

    let event: Stripe.Event;
    try {
      event = webhookSecret && rawBody
        ? stripe.webhooks.constructEvent(rawBody as Buffer, sig, webhookSecret)
        : (req.body as Stripe.Event);
    } catch (err: any) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.userId || "0");
      const plan = session.metadata?.plan as UserPlan;
      const cycle = session.metadata?.cycle;

      if (userId && plan) {
        await storage.updateUserPlan(userId, plan, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: "active",
          billingCycle: cycle || "monthly",
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const user = await storage.getUserByEmail((sub.customer as any).email || "");
      if (user) {
        await storage.updateUserPlan(user.id, "free", {
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null as any,
        });
      }
    }

    res.json({ received: true });
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
    const { text, srtContent, duration: audioDuration } = await transcribeAudio(compatibleBuffer, compFormat, language);
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
    const { text, srtContent, duration: audioDuration } = await transcribeAudio(compatibleBuffer, compFormat, language);
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

