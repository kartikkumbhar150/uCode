import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  focusSessions,
  type FocusSession as FocusSessionRow,
  type NewFocusSession,
} from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IFocusSession {
  _id: string;
  userId: string;
  taskId?: string | null;
  subject?: string | null;
  status: 'running' | 'paused' | 'completed';
  startTime: Date;
  endTime?: Date | null;
  durationSeconds: number;
  pausedSeconds: number;
  notes?: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IFocusSession>;
}

// ─── Row → Interface ─────────────────────────────────────────────────────────
const rowToSession = (row: FocusSessionRow): IFocusSession => ({
  _id: row.id,
  userId: row.userId,
  taskId: row.taskId,
  subject: row.subject,
  status: row.status as 'running' | 'paused' | 'completed',
  startTime: row.startTime,
  endTime: row.endTime,
  durationSeconds: row.durationSeconds,
  pausedSeconds: row.pausedSeconds,
  notes: row.notes,
  date: row.date,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<IFocusSession> {
    const db = getDb();
    const [updated] = await db
      .update(focusSessions)
      .set({
        taskId: this.taskId ?? null,
        subject: this.subject ?? null,
        status: this.status,
        endTime: this.endTime ?? null,
        durationSeconds: this.durationSeconds,
        pausedSeconds: this.pausedSeconds,
        notes: this.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(focusSessions.id, this._id))
      .returning();
    return rowToSession(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const FocusSession = {
  async create(data: {
    userId: string;
    taskId?: string;
    subject?: string;
    startTime: Date;
    date: Date;
  }): Promise<IFocusSession> {
    const db = getDb();
    const insert: NewFocusSession = {
      userId: data.userId,
      taskId: data.taskId ?? null,
      subject: data.subject ?? null,
      status: 'running',
      startTime: data.startTime,
      date: data.date,
      durationSeconds: 0,
      pausedSeconds: 0,
    };
    const [row] = await db.insert(focusSessions).values(insert).returning();
    return rowToSession(row);
  },

  async findById(id: string): Promise<IFocusSession | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.id, id))
      .limit(1);
    return row ? rowToSession(row) : null;
  },

  async findOne(filter: {
    _id?: string;
    userId?: string;
    status?: string;
  }): Promise<IFocusSession | null> {
    const db = getDb();
    const conditions = [];
    if (filter._id) conditions.push(eq(focusSessions.id, filter._id));
    if (filter.userId) conditions.push(eq(focusSessions.userId, filter.userId));
    if (filter.status)
      conditions.push(eq(focusSessions.status, filter.status as any));

    const [row] = await db
      .select()
      .from(focusSessions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1);
    return row ? rowToSession(row) : null;
  },

  async find(filter: {
    userId: string;
    date?: { $gte?: Date; $lte?: Date };
    status?: string;
  }): Promise<IFocusSession[]> {
    const db = getDb();
    const conditions = [eq(focusSessions.userId, filter.userId)];
    if (filter.date?.$gte) conditions.push(gte(focusSessions.date, filter.date.$gte));
    if (filter.date?.$lte) conditions.push(lte(focusSessions.date, filter.date.$lte));
    if (filter.status)
      conditions.push(eq(focusSessions.status, filter.status as any));

    const rows = await db
      .select()
      .from(focusSessions)
      .where(and(...conditions))
      .orderBy(desc(focusSessions.startTime));
    return rows.map(rowToSession);
  },

  async findRunning(userId: string): Promise<IFocusSession | null> {
    return this.findOne({ userId, status: 'running' });
  },

  async findPaused(userId: string): Promise<IFocusSession | null> {
    return this.findOne({ userId, status: 'paused' });
  },

  async findActive(userId: string): Promise<IFocusSession | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          // running OR paused
          gte(focusSessions.status, 'paused' as any)
        )
      )
      .limit(1);

    // Manual check since we can't easily do OR with enums
    if (row && (row.status === 'running' || row.status === 'paused')) {
      return rowToSession(row);
    }

    // Fallback: try running first, then paused
    const running = await this.findRunning(userId);
    if (running) return running;
    return this.findPaused(userId);
  },
};

export default FocusSession;
