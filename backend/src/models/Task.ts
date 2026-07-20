import { eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from '../config/db';
import { tasks, type Task as TaskRow, type NewTask } from '../config/schema';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface ITask {
  _id: string;
  userId: string;
  taskName: string;
  date: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<ITask>;
}

// ─── Helper: row → ITask ──────────────────────────────────────────────────────
const rowToTask = (row: TaskRow): ITask => ({
  _id: row.id,
  userId: row.userId,
  taskName: row.taskName,
  date: row.date,
  isCompleted: row.isCompleted,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<ITask> {
    const db = getDb();
    const [updated] = await db
      .update(tasks)
      .set({
        taskName: this.taskName,
        date: this.date,
        isCompleted: this.isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, this._id))
      .returning();
    return rowToTask(updated);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const Task = {
  async find(filter: {
    userId: string;
    date?: { $gte?: Date; $lte?: Date };
  }): Promise<ITask[]> {
    const db = getDb();
    const conditions = [eq(tasks.userId, filter.userId)];

    if (filter.date?.$gte) conditions.push(gte(tasks.date, filter.date.$gte));
    if (filter.date?.$lte) conditions.push(lte(tasks.date, filter.date.$lte));

    const rows = await db.select().from(tasks).where(and(...conditions));
    return rows.map(rowToTask);
  },

  async findOne(filter: { _id?: string; userId?: string }): Promise<ITask | null> {
    const db = getDb();
    const conditions = [];

    if (filter._id) conditions.push(eq(tasks.id, filter._id));
    if (filter.userId) conditions.push(eq(tasks.userId, filter.userId));

    const [row] = await db
      .select()
      .from(tasks)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1);

    return row ? rowToTask(row) : null;
  },

  async create(data: {
    userId: string;
    taskName: string;
    date: Date;
    isCompleted?: boolean;
  }): Promise<ITask> {
    const db = getDb();
    const insert: NewTask = {
      userId: data.userId,
      taskName: data.taskName,
      date: data.date,
      isCompleted: data.isCompleted ?? false,
    };
    const [row] = await db.insert(tasks).values(insert).returning();
    return rowToTask(row);
  },
};

export default Task;
