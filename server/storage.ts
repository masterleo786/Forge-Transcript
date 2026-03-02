import { transcripts, type InsertTranscript, type Transcript, type TranscriptStatus } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getTranscripts(): Promise<Transcript[]>;
  getTranscript(id: number): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  updateTranscriptStatus(id: number, status: TranscriptStatus, error?: string): Promise<Transcript>;
  updateTranscriptResult(id: number, updates: Partial<Transcript>): Promise<Transcript>;
  deleteTranscript(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getTranscripts(): Promise<Transcript[]> {
    return await db.select().from(transcripts).orderBy(desc(transcripts.createdAt));
  }

  async getTranscript(id: number): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return transcript;
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const [transcript] = await db
      .insert(transcripts)
      .values({ ...insertTranscript, status: "pending" })
      .returning();
    return transcript;
  }

  async updateTranscriptStatus(id: number, status: TranscriptStatus, error?: string): Promise<Transcript> {
    const [updated] = await db
      .update(transcripts)
      .set({ status, errorMessage: error || null })
      .where(eq(transcripts.id, id))
      .returning();
    return updated;
  }

  async updateTranscriptResult(id: number, updates: Partial<Transcript>): Promise<Transcript> {
    const [updated] = await db
      .update(transcripts)
      .set({ ...updates, status: "complete" })
      .where(eq(transcripts.id, id))
      .returning();
    return updated;
  }

  async deleteTranscript(id: number): Promise<void> {
    await db.delete(transcripts).where(eq(transcripts.id, id));
  }
}

export const storage = new DatabaseStorage();
