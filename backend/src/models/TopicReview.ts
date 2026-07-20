import { eq, desc } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  topicReviews,
  type TopicReview as ReviewRow,
  type NewTopicReview,
} from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface ITopicReview {
  _id: string;
  topicId: string;
  userId: string;
  confidence: number;
  notes?: string | null;
  reviewedAt: Date;
  nextReviewAt: Date;
}

// ─── Row → Interface ─────────────────────────────────────────────────────────
const rowToReview = (row: ReviewRow): ITopicReview => ({
  _id: row.id,
  topicId: row.topicId,
  userId: row.userId,
  confidence: row.confidence,
  notes: row.notes,
  reviewedAt: row.reviewedAt,
  nextReviewAt: row.nextReviewAt,
});

// ─── Static model ──────────────────────────────────────────────────────────────
const TopicReview = {
  async create(data: {
    topicId: string;
    userId: string;
    confidence: number;
    notes?: string;
    nextReviewAt: Date;
  }): Promise<ITopicReview> {
    const db = getDb();
    const insert: NewTopicReview = {
      topicId: data.topicId,
      userId: data.userId,
      confidence: data.confidence,
      notes: data.notes ?? null,
      reviewedAt: new Date(),
      nextReviewAt: data.nextReviewAt,
    };
    const [row] = await db.insert(topicReviews).values(insert).returning();
    return rowToReview(row);
  },

  async findByTopic(topicId: string): Promise<ITopicReview[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(topicReviews)
      .where(eq(topicReviews.topicId, topicId))
      .orderBy(desc(topicReviews.reviewedAt));
    return rows.map(rowToReview);
  },

  async findByUser(userId: string, limit: number = 50): Promise<ITopicReview[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(topicReviews)
      .where(eq(topicReviews.userId, userId))
      .orderBy(desc(topicReviews.reviewedAt))
      .limit(limit);
    return rows.map(rowToReview);
  },

  async countByUser(userId: string): Promise<number> {
    const db = getDb();
    const rows = await db
      .select()
      .from(topicReviews)
      .where(eq(topicReviews.userId, userId));
    return rows.length;
  },
};

export default TopicReview;
