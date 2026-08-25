import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  plan: text("plan").notNull().default("free"), // free | basic | pro
  transcriptsUsedThisMonth: integer("transcripts_used_this_month").notNull().default(0),
  monthResetDate: timestamp("month_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  transcriptsUsedThisMonth: true,
  monthResetDate: true,
  plan: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserPlan = "free" | "basic" | "pro";

// ─── Transcripts ──────────────────────────────────────────────────────────────

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  originalUrl: text("original_url"),
  platform: text("platform"), // facebook, youtube, instagram, tiktok, upload
  duration: integer("duration"), // in seconds
  language: text("language"),
  wordCount: integer("word_count"),
  status: text("status").notNull().default("pending"), // pending, processing, complete, failed
  content: text("content"),
  srtContent: text("srt_content"),
  summary: text("summary"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type TranscriptStatus = "pending" | "processing" | "complete" | "failed";

export type CreateUrlRequest = { url: string };
export type TranscriptResponse = Transcript;

// ─── Plan limits ──────────────────────────────────────────────────────────────
// Reset period is 28 days (not calendar month) for all plans.

export const PLAN_LIMITS: Record<UserPlan, { transcriptsPerMonth: number; hasAds: boolean; hasSrt: boolean; label: string }> = {
  free:  { transcriptsPerMonth: 10, hasAds: true, hasSrt: true, label: "Free" },
  basic: { transcriptsPerMonth: 10, hasAds: true, hasSrt: true, label: "Free" },
  pro:   { transcriptsPerMonth: 10, hasAds: true, hasSrt: true, label: "Free" },
};
