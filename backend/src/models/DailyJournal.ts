import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  dailyJournal,
  journalSubjects,
  journalProblems,
  type DailyJournal as JournalRow,
  type NewDailyJournal,
  type JournalSubject as SubjectRow,
  type NewJournalSubject,
  type JournalProblem as ProblemRow,
  type NewJournalProblem,
} from '../config/schema';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface IJournalSubject {
  _id: string;
  journalId: string;
  subject: string;
  hoursSpent: number;
}

export interface IJournalProblem {
  _id: string;
  journalId: string;
  platform: string;
  problemId?: string | null;
  problemTitle: string;
}

export interface IDailyJournal {
  _id: string;
  userId: string;
  date: string;
  summary?: string | null;
  mood?: number | null;
  energy?: number | null;
  focus?: number | null;
  wins: string[];
  mistakes: string[];
  notes?: string | null;
  tags: string[];
  subjects?: IJournalSubject[];
  problems?: IJournalProblem[];
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IDailyJournal>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseJsonArray = (str: string | null | undefined): string[] => {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
};

const rowToJournal = (
  row: JournalRow,
  subjects?: SubjectRow[],
  problems?: ProblemRow[]
): IDailyJournal => ({
  _id: row.id,
  userId: row.userId,
  date: row.date,
  summary: row.summary,
  mood: row.mood,
  energy: row.energy,
  focus: row.focus,
  wins: parseJsonArray(row.wins),
  mistakes: parseJsonArray(row.mistakes),
  notes: row.notes,
  tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  subjects: subjects?.map((s) => ({
    _id: s.id,
    journalId: s.journalId,
    subject: s.subject,
    hoursSpent: s.hoursSpent,
  })),
  problems: problems?.map((p) => ({
    _id: p.id,
    journalId: p.journalId,
    platform: p.platform,
    problemId: p.problemId,
    problemTitle: p.problemTitle,
  })),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,

  async save(): Promise<IDailyJournal> {
    const db = getDb();
    const [updated] = await db
      .update(dailyJournal)
      .set({
        summary: this.summary ?? null,
        mood: this.mood ?? null,
        energy: this.energy ?? null,
        focus: this.focus ?? null,
        wins: JSON.stringify(this.wins),
        mistakes: JSON.stringify(this.mistakes),
        notes: this.notes ?? null,
        tags: this.tags.join(','),
        updatedAt: new Date(),
      })
      .where(eq(dailyJournal.id, this._id))
      .returning();
    return rowToJournal(updated, this.subjects as any, this.problems as any);
  },
});

// ─── Static model ──────────────────────────────────────────────────────────────
const DailyJournalModel = {
  async create(data: {
    userId: string;
    date: string;
    summary?: string;
    mood?: number;
    energy?: number;
    focus?: number;
    wins?: string[];
    mistakes?: string[];
    notes?: string;
    tags?: string[];
  }): Promise<IDailyJournal> {
    const db = getDb();
    const insert: NewDailyJournal = {
      userId: data.userId,
      date: data.date,
      summary: data.summary ?? null,
      mood: data.mood ?? null,
      energy: data.energy ?? null,
      focus: data.focus ?? null,
      wins: JSON.stringify(data.wins || []),
      mistakes: JSON.stringify(data.mistakes || []),
      notes: data.notes ?? null,
      tags: data.tags?.join(',') ?? '',
    };
    const [row] = await db.insert(dailyJournal).values(insert).returning();
    return rowToJournal(row);
  },

  async findById(id: string): Promise<IDailyJournal | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailyJournal)
      .where(eq(dailyJournal.id, id))
      .limit(1);
    if (!row) return null;

    const subs = await db
      .select()
      .from(journalSubjects)
      .where(eq(journalSubjects.journalId, id));
    const probs = await db
      .select()
      .from(journalProblems)
      .where(eq(journalProblems.journalId, id));

    return rowToJournal(row, subs, probs);
  },

  async findByUserDate(userId: string, dateKey: string): Promise<IDailyJournal | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailyJournal)
      .where(and(eq(dailyJournal.userId, userId), eq(dailyJournal.date, dateKey)))
      .limit(1);
    if (!row) return null;

    const subs = await db
      .select()
      .from(journalSubjects)
      .where(eq(journalSubjects.journalId, row.id));
    const probs = await db
      .select()
      .from(journalProblems)
      .where(eq(journalProblems.journalId, row.id));

    return rowToJournal(row, subs, probs);
  },

  async findHistory(
    userId: string,
    limit: number = 30,
    offset: number = 0
  ): Promise<IDailyJournal[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(dailyJournal)
      .where(eq(dailyJournal.userId, userId))
      .orderBy(desc(dailyJournal.date))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => rowToJournal(r));
  },

  async addSubjects(
    journalId: string,
    subjects: { subject: string; hoursSpent: number }[]
  ): Promise<IJournalSubject[]> {
    const db = getDb();
    const inserts: NewJournalSubject[] = subjects.map((s) => ({
      journalId,
      subject: s.subject,
      hoursSpent: s.hoursSpent,
    }));
    const rows = await db.insert(journalSubjects).values(inserts).returning();
    return rows.map((r) => ({
      _id: r.id,
      journalId: r.journalId,
      subject: r.subject,
      hoursSpent: r.hoursSpent,
    }));
  },

  async addProblems(
    journalId: string,
    problems: { platform: string; problemId?: string; problemTitle: string }[]
  ): Promise<IJournalProblem[]> {
    const db = getDb();
    const inserts: NewJournalProblem[] = problems.map((p) => ({
      journalId,
      platform: p.platform,
      problemId: p.problemId ?? null,
      problemTitle: p.problemTitle,
    }));
    const rows = await db.insert(journalProblems).values(inserts).returning();
    return rows.map((r) => ({
      _id: r.id,
      journalId: r.journalId,
      platform: r.platform,
      problemId: r.problemId,
      problemTitle: r.problemTitle,
    }));
  },

  async getSubjects(journalId: string): Promise<IJournalSubject[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(journalSubjects)
      .where(eq(journalSubjects.journalId, journalId));
    return rows.map((r) => ({
      _id: r.id,
      journalId: r.journalId,
      subject: r.subject,
      hoursSpent: r.hoursSpent,
    }));
  },

  async getProblems(journalId: string): Promise<IJournalProblem[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(journalProblems)
      .where(eq(journalProblems.journalId, journalId));
    return rows.map((r) => ({
      _id: r.id,
      journalId: r.journalId,
      platform: r.platform,
      problemId: r.problemId,
      problemTitle: r.problemTitle,
    }));
  },
};

export default DailyJournalModel;
