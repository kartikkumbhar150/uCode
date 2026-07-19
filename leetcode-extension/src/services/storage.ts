// ============================================================
// storage.ts — Data layer
// ALL data is fetched/stored in Neon DB via the API.
// Only the JWT token and problem timer use local storage.
// ============================================================
import { problemsApi, revisionsApi, journalsApi, settingsApi } from "./api-client";
import { adapterGet, adapterSet } from "./storage-adapter";

export interface ProblemRecord {
  id: string;             // e.g. "0001"
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  companies: string[];
  url: string;
  language: string;
  code: string;
  runtime: string;
  memory: string;
  solvedAt: number;       // Unix timestamp
  timeSpentMs?: number;   // Time on page in ms
  notes: string;
  pattern: string;
  mistake: string;
  observation: string;
}

export interface RevisionEntry {
  problemId: string;
  scheduledDates: number[]; // Array of Unix timestamps
  nextRevisionIndex: number;
  history: RevisionResult[];
}

export interface RevisionResult {
  date: number;
  remembered: boolean;
}

export interface DayJournal {
  date: string;           // "YYYY-MM-DD"
  problemIds: string[];
  totalTimeMs: number;
}

export interface AppSettings {
  githubToken: string;
  githubUsername: string;
  githubRepo: string;
  openaiKey: string;
  groqKey: string;
  aiProvider: "openai" | "groq" | "none";
}

export interface ContestEntry {
  contestTitle: string;
  rank: number;
  rating: number;
  ratingChange: number;
  solved: number;
  total: number;
  date: number;
}

// ─── Problems (from Neon DB via API) ─────────────────────────
export async function getProblems(): Promise<Record<string, ProblemRecord>> {
  try {
    const { problems } = await problemsApi.getAll();
    return problems as Record<string, ProblemRecord>;
  } catch (err) {
    console.warn("[LeetSync] Failed to fetch problems from API, returning empty:", err);
    return {};
  }
}

export async function saveProblem(problem: ProblemRecord): Promise<void> {
  await problemsApi.upsert(problem);
}

export async function getProblemById(id: string): Promise<ProblemRecord | null> {
  const problems = await getProblems();
  return problems[id] ?? null;
}

// ─── Revisions (from Neon DB via API) ────────────────────────
export async function getRevisions(): Promise<Record<string, RevisionEntry>> {
  try {
    const { revisions } = await revisionsApi.getAll();
    return revisions as Record<string, RevisionEntry>;
  } catch (err) {
    console.warn("[LeetSync] Failed to fetch revisions from API:", err);
    return {};
  }
}

export async function saveRevision(entry: RevisionEntry): Promise<void> {
  await revisionsApi.upsert(entry);
}

export async function getTodayRevisions(): Promise<RevisionEntry[]> {
  const revisions = await getRevisions();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return Object.values(revisions).filter((entry) => {
    const nextDate = entry.scheduledDates[entry.nextRevisionIndex];
    return nextDate >= todayStart.getTime() && nextDate <= todayEnd.getTime();
  });
}

// ─── Journals (from Neon DB via API) ─────────────────────────
export async function getJournals(): Promise<Record<string, DayJournal>> {
  try {
    const { journals } = await journalsApi.getAll();
    return journals as Record<string, DayJournal>;
  } catch (err) {
    console.warn("[LeetSync] Failed to fetch journals from API:", err);
    return {};
  }
}

export async function addToJournal(
  dateStr: string,
  problemId: string,
  timeSpentMs: number
): Promise<void> {
  // Fetch existing journal for this date, then upsert
  const journals = await getJournals();
  const existing = journals[dateStr] || { date: dateStr, problemIds: [], totalTimeMs: 0 };
  if (!existing.problemIds.includes(problemId)) {
    existing.problemIds.push(problemId);
  }
  existing.totalTimeMs += timeSpentMs;
  await journalsApi.upsert(existing);
}

// ─── Settings (from Neon DB via API) ──────────────────────────
export async function getSettings(): Promise<AppSettings> {
  try {
    const { settings } = await settingsApi.get();
    return settings as AppSettings;
  } catch (err) {
    console.warn("[LeetSync] Failed to fetch settings from API:", err);
    return {
      githubToken: "",
      githubUsername: "",
      githubRepo: "leetcode-solutions",
      openaiKey: "",
      groqKey: "",
      aiProvider: "none",
    };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await settingsApi.update(settings);
}

// ─── Contests (local-only for now — no API endpoint) ──────────
const CONTEST_KEY = "leetsync_contests";

export async function getContests(): Promise<ContestEntry[]> {
  return adapterGet<ContestEntry[]>(CONTEST_KEY, []);
}

export async function addContest(entry: ContestEntry): Promise<void> {
  const contests = await getContests();
  contests.push(entry);
  await adapterSet(CONTEST_KEY, contests);
}

// ─── Problem Timer (local-only — must work offline in extension) ─
const START_TIME_KEY = "leetsync_problem_start_time";

export async function recordProblemStart(slug: string): Promise<void> {
  await adapterSet(START_TIME_KEY, { slug, startTime: Date.now() });
}

export async function getProblemElapsed(slug: string): Promise<number> {
  const data = await adapterGet<{ slug: string; startTime: number } | null>(
    START_TIME_KEY,
    null
  );
  if (!data || data.slug !== slug) return 0;
  return Date.now() - data.startTime;
}
