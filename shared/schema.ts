import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
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
