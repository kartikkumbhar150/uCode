import { pgTable, uuid, text, boolean, timestamp, pgEnum, real, integer, smallint } from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────
export const productivityTypeEnum = pgEnum('productivity_type', [
  'Productive',
  'Neutral',
  'Wasted',
]);

export const difficultyEnum = pgEnum('difficulty_level', ['Easy', 'Medium', 'Hard']);

export const importanceEnum = pgEnum('importance_level', ['Low', 'Medium', 'High', 'Critical']);

export const topicStatusEnum = pgEnum('topic_status', ['active', 'mastered', 'archived']);

export const sessionStatusEnum = pgEnum('session_status', ['running', 'paused', 'completed']);

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  googleId: text('google_id'),
  profilePhoto: text('profile_photo').default(''),
  categories: text('categories')
    .default('Study,DSA,Work,Gym,Sleep,Social Media,Gaming,Rest,Other')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskName: text('task_name').notNull(),
  date: timestamp('date').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Time Slots ───────────────────────────────────────────────────────────────
export const timeSlots = pgTable('time_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  timeRange: text('time_range').notNull(),
  taskSelected: text('task_selected'),
  category: text('category').notNull(),
  productivityType: productivityTypeEnum('productivity_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Reports ───────────────────────────────────────────────────────────────────
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  summary: text('summary').notNull(),
  productivityScore: real('productivity_score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FOCUS TIMER MODULE ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const focusSessions = pgTable('focus_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  subject: text('subject'),
  status: sessionStatusEnum('status').default('running').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  pausedSeconds: integer('paused_seconds').default(0).notNull(),
  notes: text('notes'),
  date: timestamp('date').notNull(), // date of the session (for day-level queries)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dailyFocusStats = pgTable('daily_focus_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD string for easy querying
  totalSeconds: integer('total_seconds').default(0).notNull(),
  goalSeconds: integer('goal_seconds').default(28800).notNull(), // default 8 hours
  sessionsCount: integer('sessions_count').default(0).notNull(),
  streakDays: integer('streak_days').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DAILY LEARNING JOURNAL ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const dailyJournal = pgTable('daily_journal', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  summary: text('summary'),
  mood: smallint('mood'), // 1-5
  energy: smallint('energy'), // 1-10
  focus: smallint('focus'), // 1-10
  wins: text('wins'), // JSON array of strings
  mistakes: text('mistakes'), // JSON array of strings
  notes: text('notes'), // Markdown
  tags: text('tags'), // comma-separated
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const journalSubjects = pgTable('journal_subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalId: uuid('journal_id')
    .notNull()
    .references(() => dailyJournal.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  hoursSpent: real('hours_spent').notNull(),
});

export const journalProblems = pgTable('journal_problems', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalId: uuid('journal_id')
    .notNull()
    .references(() => dailyJournal.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // LeetCode, Codeforces, HackerRank, etc.
  problemId: text('problem_id'), // e.g. "354" or "1234A"
  problemTitle: text('problem_title').notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SMART REVISION SYSTEM ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const learningTopics = pgTable('learning_topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  description: text('description'),
  difficulty: difficultyEnum('difficulty').notNull(),
  importance: importanceEnum('importance').default('Medium').notNull(),
  status: topicStatusEnum('status').default('active').notNull(),
  confidence: smallint('confidence').default(0), // 1-5, 0 = never reviewed
  reviewCount: integer('review_count').default(0).notNull(),
  lastReviewedAt: timestamp('last_reviewed_at'),
  nextReviewAt: timestamp('next_review_at'),
  // Spaced repetition interval in days (tracks current interval length)
  currentIntervalDays: integer('current_interval_days').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const topicReviews = pgTable('topic_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id')
    .notNull()
    .references(() => learningTopics.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  confidence: smallint('confidence').notNull(), // 1-5
  notes: text('notes'),
  reviewedAt: timestamp('reviewed_at').defaultNow().notNull(),
  nextReviewAt: timestamp('next_review_at').notNull(),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TimeSlot = typeof timeSlots.$inferSelect;
export type NewTimeSlot = typeof timeSlots.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;

export type DailyFocusStat = typeof dailyFocusStats.$inferSelect;
export type NewDailyFocusStat = typeof dailyFocusStats.$inferInsert;

export type DailyJournal = typeof dailyJournal.$inferSelect;
export type NewDailyJournal = typeof dailyJournal.$inferInsert;

export type JournalSubject = typeof journalSubjects.$inferSelect;
export type NewJournalSubject = typeof journalSubjects.$inferInsert;

export type JournalProblem = typeof journalProblems.$inferSelect;
export type NewJournalProblem = typeof journalProblems.$inferInsert;

export type LearningTopic = typeof learningTopics.$inferSelect;
export type NewLearningTopic = typeof learningTopics.$inferInsert;

export type TopicReview = typeof topicReviews.$inferSelect;
export type NewTopicReview = typeof topicReviews.$inferInsert;
