/**
 * Migration script: Creates all tables in Neon DB if they don't exist.
 * Safe to run multiple times (idempotent).
 * Run with: npm run migrate
 */
import dotenv from 'dotenv';
dotenv.config();

import { neon } from '@neondatabase/serverless';

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const sql = neon(connectionString);

  console.log('🚀 Running database migration...\n');

  // ─── Enums ──────────────────────────────────────────────────────────────────
  await sql`
    DO $$ BEGIN
      CREATE TYPE productivity_type AS ENUM ('Productive', 'Neutral', 'Wasted');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE importance_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE topic_status AS ENUM ('active', 'mastered', 'archived');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE session_status AS ENUM ('running', 'paused', 'completed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  console.log('✅ Enums: productivity_type, difficulty_level, importance_level, topic_status, session_status');

  // ─── Original Tables ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      google_id TEXT,
      profile_photo TEXT DEFAULT '',
      categories TEXT NOT NULL DEFAULT 'Study,DSA,Work,Gym,Sleep,Social Media,Gaming,Rest,Other',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Table: users');

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_name TEXT NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);`;
  console.log('✅ Table: tasks');

  await sql`
    CREATE TABLE IF NOT EXISTS time_slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMPTZ NOT NULL,
      time_range TEXT NOT NULL,
      task_selected TEXT,
      category TEXT NOT NULL,
      productivity_type productivity_type NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_time_slots_user_date ON time_slots(user_id, date);`;
  console.log('✅ Table: time_slots');

  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMPTZ NOT NULL,
      summary TEXT NOT NULL,
      productivity_score REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Table: reports');

  // ─── Focus Timer Tables ──────────────────────────────────────────────────────
  console.log('\n── Focus Timer ──');

  await sql`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      subject TEXT,
      status session_status NOT NULL DEFAULT 'running',
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      paused_seconds INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, date);`;
  console.log('✅ Table: focus_sessions');

  await sql`
    CREATE TABLE IF NOT EXISTS daily_focus_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_seconds INTEGER NOT NULL DEFAULT 0,
      goal_seconds INTEGER NOT NULL DEFAULT 28800,
      sessions_count INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    );
  `;
  console.log('✅ Table: daily_focus_stats');

  // ─── Daily Journal Tables ────────────────────────────────────────────────────
  console.log('\n── Daily Learning Journal ──');

  await sql`
    CREATE TABLE IF NOT EXISTS daily_journal (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      summary TEXT,
      mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
      energy SMALLINT CHECK (energy BETWEEN 1 AND 10),
      focus SMALLINT CHECK (focus BETWEEN 1 AND 10),
      wins TEXT,
      mistakes TEXT,
      notes TEXT,
      tags TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_journal_user_date ON daily_journal(user_id, date);`;
  console.log('✅ Table: daily_journal');

  await sql`
    CREATE TABLE IF NOT EXISTS journal_subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      journal_id UUID NOT NULL REFERENCES daily_journal(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      hours_spent REAL NOT NULL
    );
  `;
  console.log('✅ Table: journal_subjects');

  await sql`
    CREATE TABLE IF NOT EXISTS journal_problems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      journal_id UUID NOT NULL REFERENCES daily_journal(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      problem_id TEXT,
      problem_title TEXT NOT NULL
    );
  `;
  console.log('✅ Table: journal_problems');

  // ─── Smart Revision Tables ───────────────────────────────────────────────────
  console.log('\n── Smart Revision System ──');

  await sql`
    CREATE TABLE IF NOT EXISTS learning_topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      difficulty difficulty_level NOT NULL,
      importance importance_level NOT NULL DEFAULT 'Medium',
      status topic_status NOT NULL DEFAULT 'active',
      confidence SMALLINT DEFAULT 0 CHECK (confidence BETWEEN 0 AND 5),
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TIMESTAMPTZ,
      next_review_at TIMESTAMPTZ,
      current_interval_days INTEGER NOT NULL DEFAULT 2,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON learning_topics(user_id, subject);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_topics_next_review ON learning_topics(user_id, next_review_at);`;
  console.log('✅ Table: learning_topics');

  await sql`
    CREATE TABLE IF NOT EXISTS topic_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      confidence SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
      notes TEXT,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_review_at TIMESTAMPTZ NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reviews_topic ON topic_reviews(topic_id, reviewed_at);`;
  console.log('✅ Table: topic_reviews');

  console.log('\n🎉 Migration complete! All tables created in Neon DB.');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
