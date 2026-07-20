import { eq } from 'drizzle-orm';
import { getDb } from '../config/db';
import { reports, type Report as ReportRow, type NewReport } from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IReport {
  _id: string;
  userId: string;
  date: Date;
  summary: string;
  productivityScore: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IReport>;
}

// ─── Helper: row → IReport ────────────────────────────────────────────────────
const rowToReport = (row: ReportRow): IReport => ({
  _id: row.id,
  userId: row.userId,
  date: row.date,
  summary: row.summary,
  productivityScore: row.productivityScore,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<IReport> {
    const db = getDb();
    const [updated] = await db
      .update(reports)
      .set({
        date: this.date,
        summary: this.summary,
        productivityScore: this.productivityScore,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, this._id))
      .returning();
    return rowToReport(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const Report = {
  async find(filter: { userId: string }): Promise<IReport[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, filter.userId));
    return rows.map(rowToReport);
  },

  async findOne(filter: { _id?: string; userId?: string }): Promise<IReport | null> {
    const db = getDb();
    let row: ReportRow | undefined;

    if (filter._id) {
      [row] = await db.select().from(reports).where(eq(reports.id, filter._id)).limit(1);
    } else if (filter.userId) {
      [row] = await db.select().from(reports).where(eq(reports.userId, filter.userId)).limit(1);
    }

    return row ? rowToReport(row) : null;
  },

  async create(data: {
    userId: string;
    date: Date;
    summary: string;
    productivityScore: number;
  }): Promise<IReport> {
    const db = getDb();
    const insert: NewReport = {
      userId: data.userId,
      date: data.date,
      summary: data.summary,
      productivityScore: data.productivityScore,
    };
    const [row] = await db.insert(reports).values(insert).returning();
    return rowToReport(row);
  },
};

export default Report;
