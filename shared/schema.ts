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
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // active | canceled | past_due
  billingCycle: text("billing_cycle"), // monthly | annual
  transcriptsUsedThisMonth: integer("transcripts_used_this_month").notNull().default(0),
  monthResetDate: timestamp("month_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  transcriptsUsedThisMonth: true,
  monthResetDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  billingCycle: true,
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

export const PLAN_LIMITS: Record<UserPlan, { transcriptsPerMonth: number; hasAds: boolean; hasSrt: boolean; label: string }> = {
  free:  { transcriptsPerMonth: 3,   hasAds: true,  hasSrt: false, label: "Free"  },
  basic: { transcriptsPerMonth: 30,  hasAds: false, hasSrt: true,  label: "Basic" },
  pro:   { transcriptsPerMonth: 999, hasAds: false, hasSrt: true,  label: "Pro"   },
};

export const PLAN_PRICING = {
  basic: { monthly: 4.99, annual: 39.99, stripePriceMonthly: "", stripePriceAnnual: "" },
  pro:   { monthly: 9.99, annual: 79.99, stripePriceMonthly: "", stripePriceAnnual: "" },
};
