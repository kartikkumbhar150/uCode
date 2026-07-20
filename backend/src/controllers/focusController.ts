import { Request, Response } from 'express';
import FocusSession from '../models/FocusSession';
import DailyFocusStat from '../models/DailyFocusStat';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0];

const dateRange = (dateStr: string) => {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @desc    Start a focus session
// @route   POST /api/focus/start
export const startSession = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { taskId, subject } = req.body;

  try {
    // Check if already running
    const active = await FocusSession.findActive(user._id);
    if (active) {
      return res.status(400).json({
        message: 'A focus session is already active. Stop or pause it first.',
        activeSession: active,
      });
    }

    const now = new Date();
    const session = await FocusSession.create({
      userId: user._id,
      taskId,
      subject,
      startTime: now,
      date: now,
    });

    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Pause a running focus session
// @route   POST /api/focus/pause/:id
export const pauseSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const session = await FocusSession.findById(id);
    if (!session || session.userId !== user._id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'running') {
      return res.status(400).json({ message: 'Session is not running' });
    }

    // Calculate duration so far
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
    session.durationSeconds = elapsed - session.pausedSeconds;
    session.status = 'paused';
    const updated = await session.save();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Resume a paused focus session
// @route   POST /api/focus/resume/:id
export const resumeSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const session = await FocusSession.findById(id);
    if (!session || session.userId !== user._id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ message: 'Session is not paused' });
    }

    session.status = 'running';
    const updated = await session.save();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Stop a focus session — saves end time, duration, notes
// @route   POST /api/focus/stop/:id
export const stopSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const user = (req as any).user;

  try {
    const session = await FocusSession.findById(id);
    if (!session || session.userId !== user._id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session already completed' });
    }

    const now = new Date();
    const totalElapsed = Math.floor(
      (now.getTime() - session.startTime.getTime()) / 1000
    );
    const focusSeconds = Math.max(0, totalElapsed - session.pausedSeconds);

    session.status = 'completed';
    session.endTime = now;
    session.durationSeconds = focusSeconds;
    if (notes) session.notes = notes;
    const updated = await session.save();

    // Update daily focus stats
    const dateKey = todayKey();
    const stats = await DailyFocusStat.getOrCreate(user._id, dateKey);
    stats.totalSeconds += focusSeconds;
    stats.sessionsCount += 1;
    await stats.save();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get sessions list (filtered by date)
// @route   GET /api/focus/sessions
export const getSessions = async (req: Request, res: Response) => {
  const { date } = req.query;
  const user = (req as any).user;

  try {
    const filter: any = { userId: user._id, status: 'completed' };
    if (date) {
      const { start, end } = dateRange(date as string);
      filter.date = { $gte: start, $lte: end };
    }

    const sessions = await FocusSession.find(filter);
    res.json(sessions);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single session
// @route   GET /api/focus/sessions/:id
export const getSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const session = await FocusSession.findById(id);
    if (!session || session.userId !== user._id) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get today's active/running session
// @route   GET /api/focus/active
export const getActiveSession = async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const session = await FocusSession.findActive(user._id);
    res.json(session || null);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Today's focus stats
// @route   GET /api/focus/stats/today
export const getTodayStats = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const dateKey = todayKey();
    const stats = await DailyFocusStat.getOrCreate(user._id, dateKey);

    // Get today's completed sessions for longest/average
    const { start, end } = dateRange(dateKey);
    const sessions = await FocusSession.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
      status: 'completed',
    });

    const durations = sessions.map((s) => s.durationSeconds);
    const longest = durations.length > 0 ? Math.max(...durations) : 0;
    const average = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Calculate total break time (gaps between sessions)
    let breakSeconds = 0;
    if (sessions.length > 1) {
      const sorted = sessions
        .filter((s) => s.endTime)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].startTime.getTime() - (sorted[i - 1].endTime!.getTime());
        if (gap > 0) breakSeconds += Math.floor(gap / 1000);
      }
    }

    res.json({
      totalSeconds: stats.totalSeconds,
      goalSeconds: stats.goalSeconds,
      sessionsCount: stats.sessionsCount,
      longestSessionSeconds: longest,
      averageSessionSeconds: average,
      breakTimeSeconds: breakSeconds,
      streakDays: stats.streakDays,
      goalProgress: stats.goalSeconds > 0
        ? parseFloat(((stats.totalSeconds / stats.goalSeconds) * 100).toFixed(1))
        : 0,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Weekly bar chart data (last 7 days)
// @route   GET /api/focus/stats/weekly
export const getWeeklyStats = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);

    const endKey = end.toISOString().split('T')[0];
    const startKey = start.toISOString().split('T')[0];

    const stats = await DailyFocusStat.findRange(user._id, startKey, endKey);
    const statsMap = new Map(stats.map((s) => [s.date, s]));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const stat = statsMap.get(key);
      days.push({
        date: key,
        day: dayName,
        totalSeconds: stat?.totalSeconds ?? 0,
        totalHours: parseFloat(((stat?.totalSeconds ?? 0) / 3600).toFixed(1)),
        sessionsCount: stat?.sessionsCount ?? 0,
        goalSeconds: stat?.goalSeconds ?? 28800,
      });
    }

    res.json(days);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Monthly heatmap (GitHub-style)
// @route   GET /api/focus/stats/heatmap
export const getHeatmap = async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const user = (req as any).user;

  try {
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startKey = firstDay.toISOString().split('T')[0];
    const endKey = lastDay.toISOString().split('T')[0];

    const stats = await DailyFocusStat.findRange(user._id, startKey, endKey);
    const statsMap = new Map(stats.map((s) => [s.date, s]));

    const daysInMonth = lastDay.getDate();
    const dailyHours: { [key: string]: number } = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const stat = statsMap.get(key);
      dailyHours[key] = parseFloat(((stat?.totalSeconds ?? 0) / 3600).toFixed(1));
    }

    const maxHours = Math.max(...Object.values(dailyHours), 0.1);

    res.json({
      month: m,
      year: y,
      daysInMonth,
      dailyHours,
      maxHours,
      firstDayOfWeek: firstDay.getDay(),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Subject distribution (pie chart data)
// @route   GET /api/focus/stats/subjects
export const getSubjectDistribution = async (req: Request, res: Response) => {
  const { days } = req.query;
  const user = (req as any).user;

  try {
    const lookbackDays = parseInt(days as string) || 7;
    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const sessions = await FocusSession.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
      status: 'completed',
    });

    const subjectMap: { [key: string]: number } = {};
    let totalSeconds = 0;

    sessions.forEach((s) => {
      const key = s.subject || 'Uncategorized';
      subjectMap[key] = (subjectMap[key] || 0) + s.durationSeconds;
      totalSeconds += s.durationSeconds;
    });

    const distribution = Object.entries(subjectMap)
      .map(([subject, seconds]) => ({
        subject,
        seconds,
        hours: parseFloat((seconds / 3600).toFixed(1)),
        percentage: totalSeconds > 0
          ? parseFloat(((seconds / totalSeconds) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    res.json({ totalSeconds, distribution });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Set today's goal (in hours)
// @route   PUT /api/focus/goal
export const setGoal = async (req: Request, res: Response) => {
  const { hours } = req.body;
  const user = (req as any).user;

  try {
    if (!hours || hours <= 0 || hours > 24) {
      return res.status(400).json({ message: 'Hours must be between 0 and 24' });
    }

    const dateKey = todayKey();
    const stats = await DailyFocusStat.getOrCreate(user._id, dateKey);
    stats.goalSeconds = Math.round(hours * 3600);
    const updated = await stats.save();

    res.json({
      goalSeconds: updated.goalSeconds,
      goalHours: hours,
      currentSeconds: updated.totalSeconds,
      progress: parseFloat(((updated.totalSeconds / updated.goalSeconds) * 100).toFixed(1)),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get current streak
// @route   GET /api/focus/streak
export const getStreak = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const dateKey = todayKey();
    const streak = await DailyFocusStat.calculateStreak(user._id, dateKey);

    // Check if today has activity (then +1)
    const todayStat = await DailyFocusStat.findByDate(user._id, dateKey);
    const todayActive = todayStat && todayStat.totalSeconds > 0;

    res.json({
      currentStreak: todayActive ? streak + 1 : streak,
      todayActive,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
