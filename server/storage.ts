import {
  transcripts, users,
  type InsertTranscript, type Transcript, type TranscriptStatus,
  type InsertUser, type User, type UserPlan, PLAN_LIMITS,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IStorage {
  // Transcripts
  getTranscripts(userId?: number): Promise<Transcript[]>;
  getTranscript(id: number): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  updateTranscriptStatus(id: number, status: TranscriptStatus, error?: string): Promise<Transcript>;
  updateTranscriptResult(id: number, updates: Partial<Transcript>): Promise<Transcript>;
  deleteTranscript(id: number): Promise<void>;
  getTranscriptCountThisMonth(userId: number): Promise<number>;

  // Users
  createUser(user: InsertUser & { password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  findOrCreateOAuthUser(email: string, name?: string): Promise<User>;
  updateUserPlan(id: number, plan: UserPlan, stripeData?: Partial<User>): Promise<User>;
  incrementTranscriptUsage(userId: number): Promise<void>;
  resetMonthlyUsageIfNeeded(userId: number): Promise<void>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  // ── Transcripts ──────────────────────────────────────────────────────────────

  async getTranscripts(userId?: number): Promise<Transcript[]> {
    if (userId) {
      return await db.select().from(transcripts)
        .where(eq(transcripts.userId, userId))
        .orderBy(desc(transcripts.createdAt));
    }
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

  async getTranscriptCountThisMonth(userId: number): Promise<number> {
    const user = await this.getUserById(userId);
    if (!user) return 0;
    await this.resetMonthlyUsageIfNeeded(userId);
    const refreshed = await this.getUserById(userId);
    return refreshed?.transcriptsUsedThisMonth ?? 0;
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async createUser(data: InsertUser & { password: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email,
      password: data.password,
      name: data.name,
      plan: "free",
    }).returning();
    return user;
  }

  async findOrCreateOAuthUser(email: string, name?: string): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) return existing;
    // Create with a random unusable password — OAuth users never use password login
    const randomPw = await import("crypto").then(c => c.randomBytes(32).toString("hex"));
    const hashed = await import("bcrypt").then(b => b.hash(randomPw, 10));
    const [user] = await db.insert(users).values({
      email,
      password: hashed,
      name: name ?? email.split("@")[0],
      plan: "free",
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserPlan(id: number, plan: UserPlan, stripeData?: Partial<User>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ plan, ...stripeData })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async incrementTranscriptUsage(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ transcriptsUsedThisMonth: sql`${users.transcriptsUsedThisMonth} + 1` })
      .where(eq(users.id, userId));
  }

  async resetMonthlyUsageIfNeeded(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    const resetDate = user.monthResetDate ?? new Date();
    const now = new Date();
    // Reset every 28 days (rolling window)
    const daysDiff = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 28) {
      await db
        .update(users)
        .set({ transcriptsUsedThisMonth: 0, monthResetDate: now })
        .where(eq(users.id, userId));
    }
  }
}

export const storage = new DatabaseStorage();
