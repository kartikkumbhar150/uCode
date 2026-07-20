import { eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from '../config/db';
import { timeSlots, type TimeSlot as TimeSlotRow, type NewTimeSlot } from '../config/schema';

// ─── Enum ─────────────────────────────────────────────────────────────────────
export enum ProductivityType {
  PRODUCTIVE = 'Productive',
  NEUTRAL = 'Neutral',
  WASTED = 'Wasted',
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface ITimeSlot {
  _id: string;
  userId: string;
  date: Date;
  timeRange: string;
  taskSelected?: string;
  category: string;
  productivityType: ProductivityType;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<ITimeSlot>;
}

// ─── Helper: row → ITimeSlot ──────────────────────────────────────────────────
const rowToSlot = (row: TimeSlotRow): ITimeSlot => ({
  _id: row.id,
  userId: row.userId,
  date: row.date,
  timeRange: row.timeRange,
  taskSelected: row.taskSelected ?? undefined,
  category: row.category,
  productivityType: row.productivityType as ProductivityType,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<ITimeSlot> {
    const db = getDb();
    const [updated] = await db
      .update(timeSlots)
      .set({
        date: this.date,
        timeRange: this.timeRange,
        taskSelected: this.taskSelected ?? null,
        category: this.category,
        productivityType: this.productivityType,
        updatedAt: new Date(),
      })
      .where(eq(timeSlots.id, this._id))
      .returning();
    return rowToSlot(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const TimeSlot = {
  async find(filter: {
    userId: string;
    date?: { $gte?: Date; $lte?: Date };
  }): Promise<ITimeSlot[]> {
    const db = getDb();
    const conditions = [eq(timeSlots.userId, filter.userId)];

    if (filter.date?.$gte) conditions.push(gte(timeSlots.date, filter.date.$gte));
    if (filter.date?.$lte) conditions.push(lte(timeSlots.date, filter.date.$lte));

    const rows = await db
      .select()
      .from(timeSlots)
      .where(and(...conditions))
      .orderBy(timeSlots.timeRange);

    return rows.map(rowToSlot);
  },

  async findOne(filter: {
    _id?: string;
    userId?: string;
    timeRange?: string;
    date?: { $gte?: Date; $lte?: Date };
  }): Promise<ITimeSlot | null> {
    const db = getDb();
    const conditions = [];

    if (filter._id) conditions.push(eq(timeSlots.id, filter._id));
    if (filter.userId) conditions.push(eq(timeSlots.userId, filter.userId));
    if (filter.timeRange) conditions.push(eq(timeSlots.timeRange, filter.timeRange));
    if (filter.date?.$gte) conditions.push(gte(timeSlots.date, filter.date.$gte));
    if (filter.date?.$lte) conditions.push(lte(timeSlots.date, filter.date.$lte));

    const [row] = await db
      .select()
      .from(timeSlots)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1);

    return row ? rowToSlot(row) : null;
  },

  async findOneAndDelete(filter: {
    _id?: string;
    userId?: string;
  }): Promise<ITimeSlot | null> {
    const db = getDb();
    const conditions = [];

    if (filter._id) conditions.push(eq(timeSlots.id, filter._id));
    if (filter.userId) conditions.push(eq(timeSlots.userId, filter.userId));

    const [row] = await db
      .delete(timeSlots)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .returning();

    return row ? rowToSlot(row) : null;
  },

  async create(data: {
    userId: string;
    date: Date;
    timeRange: string;
    taskSelected?: string;
    category: string;
    productivityType: ProductivityType;
  }): Promise<ITimeSlot> {
    const db = getDb();
    const insert: NewTimeSlot = {
      userId: data.userId,
      date: data.date,
      timeRange: data.timeRange,
      taskSelected: data.taskSelected ?? null,
      category: data.category,
      productivityType: data.productivityType,
    };
    const [row] = await db.insert(timeSlots).values(insert).returning();
    return rowToSlot(row);
  },
};

export default TimeSlot;
