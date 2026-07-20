// ============================================================
// clario-api.ts — Dedicated API client for the Clario backend
// Base: https://clario-track-your-time.vercel.app/api
// Attaches the same JWT token used by the extension.
// ============================================================

import { getToken } from "./storage-adapter";

const BASE = "https://clario-track-your-time.vercel.app/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error((err as { message: string }).message || `HTTP ${res.status}`);
  }

  // Some endpoints return empty/null
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

// ─── Auth ─────────────────────────────────────────────────────
export const clarioAuth = {
  register: (name: string, email: string, password: string) =>
    req<{ _id: string; name: string; email: string; categories: string[]; token: string }>(
      "POST", "/auth/register", { name, email, password }
    ),

  login: (email: string, password: string) =>
    req<{ _id: string; name: string; email: string; categories: string[]; token: string }>(
      "POST", "/auth/login", { email, password }
    ),

  me: () =>
    req<{ _id: string; name: string; email: string; categories: string[] }>(
      "GET", "/auth/me"
    ),
};

// ─── Focus Timer ──────────────────────────────────────────────
export interface FocusSession {
  _id: string;
  userId: string;
  taskId?: string;
  subject?: string;
  startTime: string;
  endTime?: string;
  status: "running" | "paused" | "completed";
  durationSeconds: number;
  pausedSeconds: number;
  notes?: string;
  date: string;
}

export interface TodayFocusStats {
  totalSeconds: number;
  goalSeconds: number;
  sessionsCount: number;
  longestSessionSeconds: number;
  averageSessionSeconds: number;
  breakTimeSeconds: number;
  streakDays: number;
  goalProgress: number;
}

export interface WeeklyDay {
  date: string;
  day: string;
  totalSeconds: number;
  totalHours: number;
  sessionsCount: number;
  goalSeconds: number;
}

export interface FocusHeatmap {
  month: number;
  year: number;
  daysInMonth: number;
  dailyHours: Record<string, number>;
  maxHours: number;
  firstDayOfWeek: number;
}

export interface SubjectDistribution {
  totalSeconds: number;
  distribution: { subject: string; seconds: number; hours: number; percentage: number }[];
}

export const focusApi = {
  startSession: (subject?: string, taskId?: string) =>
    req<FocusSession>("POST", "/focus/start", { subject, taskId }),

  pauseSession: (id: string) =>
    req<FocusSession>("POST", `/focus/pause/${id}`),

  resumeSession: (id: string) =>
    req<FocusSession>("POST", `/focus/resume/${id}`),

  stopSession: (id: string, notes?: string) =>
    req<FocusSession>("POST", `/focus/stop/${id}`, notes ? { notes } : undefined),

  getActiveSession: () =>
    req<FocusSession | null>("GET", "/focus/active"),

  getSessions: (date?: string) =>
    req<FocusSession[]>("GET", `/focus/sessions${date ? `?date=${date}` : ""}`),

  getTodayStats: () =>
    req<TodayFocusStats>("GET", "/focus/stats/today"),

  getWeeklyStats: () =>
    req<WeeklyDay[]>("GET", "/focus/stats/weekly"),

  getHeatmap: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return req<FocusHeatmap>("GET", `/focus/stats/heatmap${qs ? `?${qs}` : ""}`);
  },

  getSubjectDistribution: (days?: number) =>
    req<SubjectDistribution>("GET", `/focus/stats/subjects${days ? `?days=${days}` : ""}`),

  setGoal: (hours: number) =>
    req<{ goalSeconds: number; goalHours: number; currentSeconds: number; progress: number }>(
      "PUT", "/focus/goal", { hours }
    ),

  getStreak: () =>
    req<{ currentStreak: number; todayActive: boolean }>("GET", "/focus/streak"),
};

// ─── Daily Journal ────────────────────────────────────────────
export interface ClarioJournal {
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
  subjects?: { _id: string; subject: string; hoursSpent: number }[];
  problems?: { _id: string; platform: string; problemId?: string; problemTitle: string }[];
}

export const clarioJournalApi = {
  createOrUpdate: (data: {
    date?: string; summary?: string; mood?: number; energy?: number; focus?: number;
    wins?: string[]; mistakes?: string[]; notes?: string; tags?: string[];
  }) => req<ClarioJournal>("POST", "/journal", data),

  getToday: () => req<ClarioJournal | null>("GET", "/journal/today"),

  getByDate: (date: string) => req<ClarioJournal | null>("GET", `/journal/date/${date}`),

  getHistory: (limit = 30, offset = 0) =>
    req<ClarioJournal[]>("GET", `/journal/history?limit=${limit}&offset=${offset}`),

  update: (id: string, data: Partial<ClarioJournal>) =>
    req<ClarioJournal>("PUT", `/journal/${id}`, data),

  addSubjects: (id: string, subjects: { subject: string; hoursSpent: number }[]) =>
    req<unknown>("POST", `/journal/${id}/subjects`, { subjects }),

  getSubjects: (id: string) =>
    req<{ _id: string; subject: string; hoursSpent: number }[]>("GET", `/journal/${id}/subjects`),

  addProblems: (id: string, problems: { platform: string; problemId?: string; problemTitle: string }[]) =>
    req<unknown>("POST", `/journal/${id}/problems`, { problems }),

  getProblems: (id: string) =>
    req<{ _id: string; platform: string; problemId?: string; problemTitle: string }[]>("GET", `/journal/${id}/problems`),
};

// ─── Revision / Spaced Repetition ─────────────────────────────
export interface LearningTopic {
  _id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  importance?: "low" | "medium" | "high";
  status: "active" | "mastered" | "archived";
  confidence: number;
  reviewCount: number;
  currentIntervalDays: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface TopicReview {
  _id: string;
  topicId: string;
  userId: string;
  confidence: number;
  notes?: string;
  reviewedAt: string;
  nextReviewAt: string;
}

export interface RevisionStats {
  totalTopics: number;
  mastered: number;
  active: number;
  archived: number;
  totalReviews: number;
  avgConfidence: number;
  subjectsBreakdown: Record<string, number>;
  queue: { dueToday: number; dueTomorrow: number; dueThisWeek: number };
}

export const clarioRevisionApi = {
  createTopic: (data: { title: string; subject: string; difficulty: string; description?: string; importance?: string }) =>
    req<LearningTopic>("POST", "/revision/topics", data),

  getTopics: () => req<LearningTopic[]>("GET", "/revision/topics"),

  getTopic: (id: string) =>
    req<LearningTopic & { reviews: TopicReview[] }>("GET", `/revision/topics/${id}`),

  updateTopic: (id: string, data: Partial<LearningTopic>) =>
    req<LearningTopic>("PUT", `/revision/topics/${id}`, data),

  deleteTopic: (id: string) => req<{ message: string }>("DELETE", `/revision/topics/${id}`),

  getDueTopics: () => req<LearningTopic[]>("GET", "/revision/due"),

  submitReview: (topicId: string, confidence: number, notes?: string) =>
    req<{ topic: LearningTopic; review: TopicReview; nextReviewAt: string; nextIntervalDays: number }>(
      "POST", `/revision/review/${topicId}`, { confidence, notes }
    ),

  getReviewHistory: (limit = 50) =>
    req<TopicReview[]>("GET", `/revision/history?limit=${limit}`),

  getQueue: () =>
    req<{ dueToday: number; dueTomorrow: number; dueThisWeek: number }>("GET", "/revision/queue"),

  getKnowledgeTree: () =>
    req<Record<string, { total: number; mastered: number; active: number; topics: { _id: string; title: string; status: string; confidence: number; nextReviewAt?: string }[] }>>(
      "GET", "/revision/tree"
    ),

  getRevisionStats: () => req<RevisionStats>("GET", "/revision/stats"),

  searchTopics: (q: string) => req<LearningTopic[]>("GET", `/revision/search?q=${encodeURIComponent(q)}`),
};

// ─── Tasks ────────────────────────────────────────────────────
export interface ClarioTask {
  _id: string;
  userId: string;
  taskName: string;
  date: string;
  isCompleted: boolean;
}

export const clarioTasksApi = {
  create: (taskName: string, date: string) =>
    req<ClarioTask>("POST", "/tasks", { taskName, date }),

  getByDate: (date: string) =>
    req<ClarioTask[]>("GET", `/tasks?date=${date}`),

  markCompleted: (id: string) =>
    req<ClarioTask>("PUT", `/tasks/${id}/complete`),
};

// ─── Time Slots ───────────────────────────────────────────────
export interface TimeSlot {
  _id: string;
  userId: string;
  date: string;
  timeRange: string;
  taskSelected?: string;
  category: string;
  productivityType: "productive" | "neutral" | "wasted";
}

export const slotsApi = {
  create: (data: { date: string; timeRange: string; taskSelected?: string; category: string; productivityType: string }) =>
    req<TimeSlot>("POST", "/slots", data),

  getByDate: (date: string) =>
    req<TimeSlot[]>("GET", `/slots?date=${date}`),

  update: (id: string, data: Partial<TimeSlot>) =>
    req<TimeSlot>("PUT", `/slots/${id}`, data),

  delete: (id: string) => req<{ message: string }>("DELETE", `/slots/${id}`),

  batchUpdate: (data: { date: string; timeRanges: string[]; taskSelected?: string; category: string; productivityType: string }) =>
    req<TimeSlot[]>("PATCH", "/slots/batch", data),
};

// ─── Analytics ────────────────────────────────────────────────
export interface AnalyticsData {
  totalMinutes: number;
  productiveMinutes: number;
  wastedMinutes: number;
  neutralMinutes: number;
  productivityPercentage: number;
  productivityIndex: number;
  categoryBreakdown: Record<string, number>;
  taskBreakdown: Record<string, number>;
  productivityByCategory: Record<string, { productive: number; neutral: number; wasted: number }>;
  totalTasks: number;
  completedTasks: number;
  insights: string;
}

export interface WeeklyTrend {
  trend: {
    date: string;
    productiveMin: number;
    wastedMin: number;
    neutralMin: number;
    totalMin: number;
    tasksCompleted: number;
    tasksMissed: number;
    productivityIndex: number;
  }[];
  cumulativeFocus: { date: string; cumulativeMinutes: number }[];
}

export interface AnalyticsHeatmap {
  month: number;
  year: number;
  daysInMonth: number;
  dailyMinutes: Record<string, number>;
  maxMinutes: number;
  hourlyMap: Record<string, Record<number, number>>;
  firstDayOfWeek: number;
}

export const analyticsApi = {
  getAnalytics: (period: "day" | "week", date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return req<AnalyticsData>("GET", `/analytics/${period}${qs}`);
  },

  getWeeklyTrend: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return req<WeeklyTrend>("GET", `/analytics/weekly-trend${qs}`);
  },

  getHeatmapData: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return req<AnalyticsHeatmap>("GET", `/analytics/heatmap${qs ? `?${qs}` : ""}`);
  },
};

// ─── AI Insights ──────────────────────────────────────────────
export interface AIInsightsData {
  insights: { type: string; icon: string; text: string }[];
  bestHours: { hour: number; label: string; productivityRate: number }[];
  worstHours: { hour: number; label: string; productivityRate: number }[];
  summary: string;
  stats?: {
    totalSlots: number;
    productiveSlots: number;
    wastedSlots: number;
    neutralSlots: number;
    productivityRate: number;
    taskCompletionRate: number;
    daysTracked: number;
    avgSlotsPerDay: number;
  };
}

export const aiApi = {
  getInsights: () => req<AIInsightsData>("GET", "/ai/insights"),
};

// ─── Reports ──────────────────────────────────────────────────
export interface ReportData {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalMinutes: number;
  productiveMinutes: number;
  wastedMinutes: number;
  neutralMinutes: number;
  productivityPercentage: number;
  productivityIndex: number;
  categoryBreakdown: Record<string, number>;
  taskBreakdown: Record<string, number>;
  totalTasks: number;
  completedTasks: number;
  dailyBreakdown: {
    date: string; productive: number; wasted: number; neutral: number; total: number;
    productivityPercentage: number; tasksCompleted: number; tasksMissed: number;
    focusSeconds: number; reviewsDone: number;
  }[];
  hourlyProductivity: { hour: number; productive: number; neutral: number; wasted: number; total: number }[];
  weekdayBreakdown: { day: string; dayIndex: number; avgProductive: number; avgWasted: number; avgNeutral: number; avgTotal: number }[];
  focus: {
    totalFocusSeconds: number; totalFocusHours: number; sessionCount: number;
    longestSessionSeconds: number; avgSessionSeconds: number;
    subjectDistribution: { subject: string; seconds: number; hours: number; percentage: number }[];
    dailyFocus: { date: string; seconds: number; hours: number }[];
    focusStreak: number; daysWithFocus: number; daysMeetingGoal: number;
  };
  journal: {
    entriesCount: number; avgMood: number | null; avgEnergy: number | null; avgFocus: number | null;
    totalWins: number; totalMistakes: number;
    moodTrend: { date: string; mood: number | null; energy: number | null; focus: number | null }[];
  };
  revision: {
    totalTopics: number; activeTopics: number; masteredTopics: number; masteredInRange: number;
    totalReviewsInRange: number; avgReviewConfidence: number;
    dailyReviews: { date: string; count: number }[];
    subjectStats: { subject: string; total: number; mastered: number; avgConf: number }[];
  };
}

export const reportsApi = {
  getReport: (startDate: string, endDate: string) =>
    req<ReportData>("GET", `/reports?startDate=${startDate}&endDate=${endDate}`),
};

// ─── User ─────────────────────────────────────────────────────
export const userApi = {
  getCategories: () => req<string[]>("GET", "/users/categories"),
  updateCategories: (categories: string[]) =>
    req<string[]>("PUT", "/users/categories", { categories }),
  getProfile: () =>
    req<{ _id: string; name: string; email: string; profilePhoto: string; categories: string[] }>(
      "GET", "/users/profile"
    ),
  updateProfile: (data: { name?: string; profilePhoto?: string }) =>
    req<{ _id: string; name: string; email: string; profilePhoto: string; categories: string[] }>(
      "PUT", "/users/profile", data
    ),
};
