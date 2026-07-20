import { eq, and } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  dailyFocusStats,
  type DailyFocusStat as DailyFocusStatRow,
  type NewDailyFocusStat,
} from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IDailyFocusStat {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  goalSeconds: number;
  sessionsCount: number;
  streakDays: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IDailyFocusStat>;
}

// ─── Row → Interface ─────────────────────────────────────────────────────────
const rowToStat = (row: DailyFocusStatRow): IDailyFocusStat => ({
  _id: row.id,
  userId: row.userId,
  date: row.date,
  totalSeconds: row.totalSeconds,
  goalSeconds: row.goalSeconds,
  sessionsCount: row.sessionsCount,
  streakDays: row.streakDays,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<IDailyFocusStat> {
    const db = getDb();
    const [updated] = await db
      .update(dailyFocusStats)
      .set({
        totalSeconds: this.totalSeconds,
        goalSeconds: this.goalSeconds,
        sessionsCount: this.sessionsCount,
        streakDays: this.streakDays,
        updatedAt: new Date(),
      })
      .where(eq(dailyFocusStats.id, this._id))
      .returning();
    return rowToStat(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const DailyFocusStat = {
  /**
   * Get or create today's stats row for a user.
   */
  async getOrCreate(userId: string, dateKey: string): Promise<IDailyFocusStat> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(dailyFocusStats)
      .where(
        and(eq(dailyFocusStats.userId, userId), eq(dailyFocusStats.date, dateKey))
      )
      .limit(1);

    if (existing) return rowToStat(existing);

    // Calculate streak
    const streakDays = await this.calculateStreak(userId, dateKey);

    const insert: NewDailyFocusStat = {
      userId,
      date: dateKey,
      totalSeconds: 0,
      goalSeconds: 28800, // 8 hours default
      sessionsCount: 0,
      streakDays,
    };

    const [row] = await db.insert(dailyFocusStats).values(insert).returning();
    return rowToStat(row);
  },

  async findByDate(userId: string, dateKey: string): Promise<IDailyFocusStat | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailyFocusStats)
      .where(
        and(eq(dailyFocusStats.userId, userId), eq(dailyFocusStats.date, dateKey))
      )
      .limit(1);
    return row ? rowToStat(row) : null;
  },

  async findRange(userId: string, startDate: string, endDate: string): Promise<IDailyFocusStat[]> {
    const db = getDb();
    const { gte, lte } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(dailyFocusStats)
      .where(
        and(
          eq(dailyFocusStats.userId, userId),
          gte(dailyFocusStats.date, startDate),
          lte(dailyFocusStats.date, endDate)
        )
      )
      .orderBy(dailyFocusStats.date);
    return rows.map(rowToStat);
  },

  /**
   * Calculate consecutive days streak ending at dateKey.
   */
  async calculateStreak(userId: string, dateKey: string): Promise<number> {
    const db = getDb();
    // Fetch the last 120 days of stats to check streak
    const startDate = new Date(dateKey);
    startDate.setDate(startDate.getDate() - 120);
    const startKey = startDate.toISOString().split('T')[0];

    const rows = await db
      .select()
      .from(dailyFocusStats)
      .where(
        and(
          eq(dailyFocusStats.userId, userId),
          // We can't easily use gte/lte on text, so fetch all and filter
        )
      );

    // Build set of dates with focus activity
    const activeDates = new Set(
      rows.filter((r) => r.totalSeconds > 0).map((r) => r.date)
    );

    let streak = 0;
    const checkDate = new Date(dateKey);
    // Check yesterday first (today might not have data yet)
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      if (activeDates.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },
};

export default DailyFocusStat;
