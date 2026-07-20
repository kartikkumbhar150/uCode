import { eq, and, lte, desc, sql } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  learningTopics,
  type LearningTopic as TopicRow,
  type NewLearningTopic,
} from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface ILearningTopic {
  _id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  importance: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'active' | 'mastered' | 'archived';
  confidence: number;
  reviewCount: number;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
  currentIntervalDays: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<ILearningTopic>;
}

// ─── Spaced Repetition Schedule ───────────────────────────────────────────────
const INITIAL_INTERVALS = [2, 4, 8, 15, 30, 60, 120]; // days

/**
 * Compute the next review date and interval based on confidence.
 * confidence 5 (perfect) → multiply interval by 2.5
 * confidence 4 (good)    → use scheduled interval
 * confidence 3 (okay)    → divide interval by 1.5
 * confidence 2 (weak)    → tomorrow
 * confidence 1 (forgot)  → today
 */
export const computeNextReview = (
  reviewCount: number,
  confidence: number,
  currentIntervalDays: number
): { nextReviewAt: Date; newIntervalDays: number } => {
  const now = new Date();

  // For first few reviews, use the fixed schedule
  let scheduledInterval =
    reviewCount < INITIAL_INTERVALS.length
      ? INITIAL_INTERVALS[reviewCount]
      : currentIntervalDays;

  let newInterval: number;

  switch (confidence) {
    case 5:
      newInterval = Math.round(scheduledInterval * 2.5);
      break;
    case 4:
      newInterval = scheduledInterval;
      break;
    case 3:
      newInterval = Math.max(1, Math.round(scheduledInterval / 1.5));
      break;
    case 2:
      newInterval = 1; // tomorrow
      break;
    case 1:
    default:
      newInterval = 0; // today
      break;
  }

  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + newInterval);
  nextDate.setHours(0, 0, 0, 0);

  return { nextReviewAt: nextDate, newIntervalDays: newInterval };
};

// ─── Row → Interface ─────────────────────────────────────────────────────────
const rowToTopic = (row: TopicRow): ILearningTopic => ({
  _id: row.id,
  userId: row.userId,
  title: row.title,
  subject: row.subject,
  description: row.description,
  difficulty: row.difficulty as ILearningTopic['difficulty'],
  importance: row.importance as ILearningTopic['importance'],
  status: row.status as ILearningTopic['status'],
  confidence: row.confidence ?? 0,
  reviewCount: row.reviewCount,
  lastReviewedAt: row.lastReviewedAt,
  nextReviewAt: row.nextReviewAt,
  currentIntervalDays: row.currentIntervalDays,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<ILearningTopic> {
    const db = getDb();
    const [updated] = await db
      .update(learningTopics)
      .set({
        title: this.title,
        subject: this.subject,
        description: this.description ?? null,
        difficulty: this.difficulty,
        importance: this.importance,
        status: this.status,
        confidence: this.confidence,
        reviewCount: this.reviewCount,
        lastReviewedAt: this.lastReviewedAt ?? null,
        nextReviewAt: this.nextReviewAt ?? null,
        currentIntervalDays: this.currentIntervalDays,
        updatedAt: new Date(),
      })
      .where(eq(learningTopics.id, this._id))
      .returning();
    return rowToTopic(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const LearningTopic = {
  async create(data: {
    userId: string;
    title: string;
    subject: string;
    description?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    importance?: 'Low' | 'Medium' | 'High' | 'Critical';
  }): Promise<ILearningTopic> {
    const db = getDb();

    // First review in 2 days
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 2);
    nextReviewAt.setHours(0, 0, 0, 0);

    const insert: NewLearningTopic = {
      userId: data.userId,
      title: data.title,
      subject: data.subject,
      description: data.description ?? null,
      difficulty: data.difficulty,
      importance: data.importance ?? 'Medium',
      status: 'active',
      confidence: 0,
      reviewCount: 0,
      nextReviewAt,
      currentIntervalDays: 2,
    };

    const [row] = await db.insert(learningTopics).values(insert).returning();
    return rowToTopic(row);
  },

  async findById(id: string): Promise<ILearningTopic | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(learningTopics)
      .where(eq(learningTopics.id, id))
      .limit(1);
    return row ? rowToTopic(row) : null;
  },

  async findByUser(userId: string): Promise<ILearningTopic[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(learningTopics)
      .where(eq(learningTopics.userId, userId))
      .orderBy(desc(learningTopics.createdAt));
    return rows.map(rowToTopic);
  },

  async findDue(userId: string, byDate?: Date): Promise<ILearningTopic[]> {
    const db = getDb();
    const dueDate = byDate || new Date();
    dueDate.setHours(23, 59, 59, 999);

    const rows = await db
      .select()
      .from(learningTopics)
      .where(
        and(
          eq(learningTopics.userId, userId),
          eq(learningTopics.status, 'active'),
          lte(learningTopics.nextReviewAt, dueDate)
        )
      )
      .orderBy(learningTopics.nextReviewAt);
    return rows.map(rowToTopic);
  },

  async findBySubject(userId: string, subject: string): Promise<ILearningTopic[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(learningTopics)
      .where(
        and(eq(learningTopics.userId, userId), eq(learningTopics.subject, subject))
      )
      .orderBy(learningTopics.title);
    return rows.map(rowToTopic);
  },

  async getSubjects(userId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .selectDistinct({ subject: learningTopics.subject })
      .from(learningTopics)
      .where(eq(learningTopics.userId, userId))
      .orderBy(learningTopics.subject);
    return rows.map((r) => r.subject);
  },

  async search(userId: string, query: string): Promise<ILearningTopic[]> {
    const db = getDb();
    const lowerQ = `%${query.toLowerCase()}%`;
    const rows = await db
      .select()
      .from(learningTopics)
      .where(
        and(
          eq(learningTopics.userId, userId),
          sql`(LOWER(${learningTopics.title}) LIKE ${lowerQ} OR LOWER(${learningTopics.subject}) LIKE ${lowerQ} OR LOWER(COALESCE(${learningTopics.description}, '')) LIKE ${lowerQ})`
        )
      )
      .orderBy(desc(learningTopics.createdAt));
    return rows.map(rowToTopic);
  },

  async deleteById(id: string): Promise<boolean> {
    const db = getDb();
    const [deleted] = await db
      .delete(learningTopics)
      .where(eq(learningTopics.id, id))
      .returning();
    return !!deleted;
  },

  async getQueue(userId: string): Promise<{ dueToday: number; dueTomorrow: number; dueThisWeek: number }> {
    const db = getDb();
    const now = new Date();

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const allActive = await db
      .select()
      .from(learningTopics)
      .where(
        and(
          eq(learningTopics.userId, userId),
          eq(learningTopics.status, 'active'),
          lte(learningTopics.nextReviewAt, endOfWeek)
        )
      );

    let dueToday = 0, dueTomorrow = 0, dueThisWeek = 0;
    for (const t of allActive) {
      if (!t.nextReviewAt) continue;
      const reviewTime = t.nextReviewAt.getTime();
      if (reviewTime <= endOfToday.getTime()) dueToday++;
      else if (reviewTime <= endOfTomorrow.getTime()) dueTomorrow++;
      dueThisWeek++;
    }

    return { dueToday, dueTomorrow, dueThisWeek };
  },
};

export default LearningTopic;
