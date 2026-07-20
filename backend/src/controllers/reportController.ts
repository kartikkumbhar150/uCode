import { Request, Response } from 'express';
import TimeSlot, { ProductivityType } from '../models/TimeSlot';
import Task from '../models/Task';
import FocusSession from '../models/FocusSession';
import DailyFocusStat from '../models/DailyFocusStat';
import DailyJournalModel from '../models/DailyJournal';
import LearningTopic from '../models/LearningTopic';
import TopicReview from '../models/TopicReview';
import { getCache, setCache } from '../services/redisService';

// @desc    Get report for a custom date range
// @route   GET /api/reports?startDate=...&endDate=...
export const getReport = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const user = (req as any).user;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required' });
  }

  try {
    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const dateKeyStart = start.toISOString().split('T')[0];
    const dateKeyEnd = end.toISOString().split('T')[0];
    const cacheKey = `user:${user._id}:reports:v2:${dateKeyStart}-${dateKeyEnd}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    // ─── Existing: Slots & Tasks ──────────────────────────────────────────
    const slots = await TimeSlot.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
    });

    const tasks = await Task.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
    });

    const totalTrackedSlots = slots.length;

    // ─── New: Focus Sessions ──────────────────────────────────────────────
    const focusSessions = await FocusSession.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
      status: 'completed',
    });

    // Build date key range
    const allDateKeys: string[] = [];
    const tempDate = new Date(start);
    while (tempDate <= end) {
      allDateKeys.push(tempDate.toISOString().split('T')[0]);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const focusStats = await DailyFocusStat.findRange(user._id, dateKeyStart, dateKeyEnd);

    // Focus aggregation
    const totalFocusSeconds = focusSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
    const focusSessionCount = focusSessions.length;
    const longestFocusSession = focusSessions.length > 0
      ? Math.max(...focusSessions.map(s => s.durationSeconds))
      : 0;
    const avgFocusSession = focusSessionCount > 0
      ? Math.round(totalFocusSeconds / focusSessionCount)
      : 0;

    // Focus subject distribution
    const focusSubjectMap: { [key: string]: number } = {};
    focusSessions.forEach(s => {
      const key = s.subject || 'Uncategorized';
      focusSubjectMap[key] = (focusSubjectMap[key] || 0) + s.durationSeconds;
    });

    // Daily focus breakdown
    const dailyFocusMap: { [key: string]: number } = {};
    focusSessions.forEach(s => {
      const dateKey = new Date(s.date).toISOString().split('T')[0];
      dailyFocusMap[dateKey] = (dailyFocusMap[dateKey] || 0) + s.durationSeconds;
    });

    // Focus goal progress
    let focusDaysMeetingGoal = 0;
    focusStats.forEach(stat => {
      if (stat.totalSeconds >= stat.goalSeconds) focusDaysMeetingGoal++;
    });

    // Focus streak
    let focusStreak = 0;
    const focusDaysWithActivity = new Set(
      focusStats.filter(s => s.totalSeconds > 0).map(s => s.date)
    );
    const streakCheckDate = new Date(end);
    while (true) {
      const key = streakCheckDate.toISOString().split('T')[0];
      if (focusDaysWithActivity.has(key)) {
        focusStreak++;
        streakCheckDate.setDate(streakCheckDate.getDate() - 1);
      } else break;
    }

    // ─── New: Journal Data ────────────────────────────────────────────────
    const journalEntries: any[] = [];
    for (const dateKey of allDateKeys) {
      const entry = await DailyJournalModel.findByUserDate(user._id, dateKey);
      if (entry) journalEntries.push(entry);
    }

    const journalCount = journalEntries.length;
    let totalMood = 0, moodCount = 0;
    let totalEnergy = 0, energyCount = 0;
    let totalFocusJ = 0, focusJCount = 0;
    let totalWins = 0;
    let totalMistakes = 0;

    const moodTrend: { date: string; mood: number | null; energy: number | null; focus: number | null }[] = [];

    journalEntries.forEach(j => {
      if (j.mood) { totalMood += j.mood; moodCount++; }
      if (j.energy) { totalEnergy += j.energy; energyCount++; }
      if (j.focus) { totalFocusJ += j.focus; focusJCount++; }
      totalWins += (j.wins?.length ?? 0);
      totalMistakes += (j.mistakes?.length ?? 0);

      moodTrend.push({
        date: j.date,
        mood: j.mood ?? null,
        energy: j.energy ?? null,
        focus: j.focus ?? null,
      });
    });

    // ─── New: Revision Data ───────────────────────────────────────────────
    const allTopics = await LearningTopic.findByUser(user._id);
    const allReviews = await TopicReview.findByUser(user._id, 1000);

    // Filter reviews in range
    const reviewsInRange = allReviews.filter(r => {
      const d = new Date(r.reviewedAt);
      return d >= start && d <= end;
    });

    const totalReviewsInRange = reviewsInRange.length;
    const avgReviewConfidence = totalReviewsInRange > 0
      ? parseFloat(
          (reviewsInRange.reduce((s, r) => s + r.confidence, 0) / totalReviewsInRange).toFixed(1)
        )
      : 0;

    // Topics mastered in range
    const masteredInRange = allTopics.filter(t => {
      if (t.status !== 'mastered' || !t.lastReviewedAt) return false;
      const d = new Date(t.lastReviewedAt);
      return d >= start && d <= end;
    }).length;

    // Reviews per day
    const dailyReviewMap: { [key: string]: number } = {};
    reviewsInRange.forEach(r => {
      const dateKey = new Date(r.reviewedAt).toISOString().split('T')[0];
      dailyReviewMap[dateKey] = (dailyReviewMap[dateKey] || 0) + 1;
    });

    // Revision subject stats
    const revisionSubjects: { [key: string]: { total: number; mastered: number; confSum: number } } = {};
    allTopics.forEach(t => {
      if (!revisionSubjects[t.subject]) {
        revisionSubjects[t.subject] = { total: 0, mastered: 0, confSum: 0 };
      }
      revisionSubjects[t.subject].total++;
      revisionSubjects[t.subject].confSum += t.confidence;
      if (t.status === 'mastered') revisionSubjects[t.subject].mastered++;
    });

    // ─── Original slot processing ─────────────────────────────────────────
    let productiveCount = 0;
    let wastedCount = 0;
    let neutralCount = 0;
    let categoryMap: { [key: string]: number } = {};
    let taskMap: { [key: string]: number } = {};
    let categoryProductivity: {
      [key: string]: { productive: number; neutral: number; wasted: number };
    } = {};

    let dailyMap: {
      [key: string]: { productive: number; wasted: number; neutral: number; total: number };
    } = {};

    let hourlyMap: { [hour: number]: { productive: number; neutral: number; wasted: number; total: number } } = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { productive: 0, neutral: 0, wasted: 0, total: 0 };
    }

    let weekdayMap: { [day: number]: { productive: number; neutral: number; wasted: number; total: number; count: number } } = {};
    for (let d = 0; d < 7; d++) {
      weekdayMap[d] = { productive: 0, neutral: 0, wasted: 0, total: 0, count: 0 };
    }

    const weekdayDays: { [day: number]: Set<string> } = {};
    for (let d = 0; d < 7; d++) weekdayDays[d] = new Set();

    slots.forEach((slot) => {
      if (slot.productivityType === ProductivityType.PRODUCTIVE) productiveCount++;
      else if (slot.productivityType === ProductivityType.WASTED) wastedCount++;
      else neutralCount++;

      categoryMap[slot.category] = (categoryMap[slot.category] || 0) + 20;

      const taskName = slot.taskSelected || slot.category;
      taskMap[taskName] = (taskMap[taskName] || 0) + 20;

      if (!categoryProductivity[slot.category]) {
        categoryProductivity[slot.category] = { productive: 0, neutral: 0, wasted: 0 };
      }
      if (slot.productivityType === ProductivityType.PRODUCTIVE) {
        categoryProductivity[slot.category].productive += 20;
      } else if (slot.productivityType === ProductivityType.WASTED) {
        categoryProductivity[slot.category].wasted += 20;
      } else {
        categoryProductivity[slot.category].neutral += 20;
      }

      const dateKey = new Date(slot.date).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { productive: 0, wasted: 0, neutral: 0, total: 0 };
      }
      dailyMap[dateKey].total += 20;
      if (slot.productivityType === ProductivityType.PRODUCTIVE) dailyMap[dateKey].productive += 20;
      else if (slot.productivityType === ProductivityType.WASTED) dailyMap[dateKey].wasted += 20;
      else dailyMap[dateKey].neutral += 20;

      const hourMatch = slot.timeRange.match(/^(\d{2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1]);
        hourlyMap[hour].total += 20;
        if (slot.productivityType === ProductivityType.PRODUCTIVE) hourlyMap[hour].productive += 20;
        else if (slot.productivityType === ProductivityType.WASTED) hourlyMap[hour].wasted += 20;
        else hourlyMap[hour].neutral += 20;
      }

      const slotDate = new Date(slot.date);
      const weekday = slotDate.getDay();
      weekdayMap[weekday].total += 20;
      weekdayDays[weekday].add(dateKey);
      if (slot.productivityType === ProductivityType.PRODUCTIVE) weekdayMap[weekday].productive += 20;
      else if (slot.productivityType === ProductivityType.WASTED) weekdayMap[weekday].wasted += 20;
      else weekdayMap[weekday].neutral += 20;
    });

    const productiveMinutes = productiveCount * 20;
    const wastedMinutes = wastedCount * 20;
    const neutralMinutes = neutralCount * 20;
    const totalMinutes = totalTrackedSlots * 20;
    const productivityPercentage = totalMinutes > 0 ? (productiveMinutes / totalMinutes) * 100 : 0;

    const taskDayMap: { [key: string]: { completed: number; total: number } } = {};
    tasks.forEach(task => {
      const key = new Date(task.date).toISOString().split('T')[0];
      if (!taskDayMap[key]) taskDayMap[key] = { completed: 0, total: 0 };
      taskDayMap[key].total++;
      if (task.isCompleted) taskDayMap[key].completed++;
    });

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, data]) => {
        const taskData = taskDayMap[date] || { completed: 0, total: 0 };
        return {
          date,
          ...data,
          productivityPercentage: data.total > 0
            ? parseFloat(((data.productive / data.total) * 100).toFixed(2))
            : 0,
          tasksCompleted: taskData.completed,
          tasksMissed: taskData.total - taskData.completed,
          focusSeconds: dailyFocusMap[date] || 0,
          reviewsDone: dailyReviewMap[date] || 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourlyProductivity = Object.entries(hourlyMap)
      .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      .sort((a, b) => a.hour - b.hour);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayBreakdown = Object.entries(weekdayMap).map(([day, data]) => {
      const dayCount = weekdayDays[parseInt(day)].size || 1;
      return {
        day: dayNames[parseInt(day)],
        dayIndex: parseInt(day),
        avgProductive: Math.round(data.productive / dayCount),
        avgWasted: Math.round(data.wasted / dayCount),
        avgNeutral: Math.round(data.neutral / dayCount),
        avgTotal: Math.round(data.total / dayCount),
      };
    });

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const daysTracked = Object.keys(dailyMap).length;

    // Enhanced Productivity Index (includes focus & revision bonuses)
    const taskRate = tasks.length > 0 ? (completedTasks / tasks.length) : 0;
    const timeUtil = totalMinutes > 0 ? (productiveMinutes / totalMinutes) : 0;
    const consistency = totalDays > 0 ? Math.min(daysTracked / totalDays, 1) : 0;
    const focusBonus = totalFocusSeconds > 0 ? Math.min(totalFocusSeconds / (totalDays * 3600 * 4), 1) * 10 : 0;
    const revisionBonus = totalReviewsInRange > 0 ? Math.min(totalReviewsInRange / (totalDays * 3), 1) * 10 : 0;
    const baseIndex = (taskRate * 30) + (timeUtil * 25) + (consistency * 25);
    const productivityIndex = Math.min(100, Math.round(baseIndex + focusBonus + revisionBonus));

    const responseData = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalDays,
      totalMinutes,
      productiveMinutes,
      wastedMinutes,
      neutralMinutes,
      productivityPercentage: parseFloat(productivityPercentage.toFixed(2)),
      productivityIndex,
      categoryBreakdown: categoryMap,
      taskBreakdown: taskMap,
      productivityByCategory: categoryProductivity,
      totalTasks: tasks.length,
      completedTasks,
      dailyBreakdown,
      hourlyProductivity,
      weekdayBreakdown,

      // ─── Focus Timer Report ────────────────────────────────────────────
      focus: {
        totalFocusSeconds,
        totalFocusHours: parseFloat((totalFocusSeconds / 3600).toFixed(1)),
        sessionCount: focusSessionCount,
        longestSessionSeconds: longestFocusSession,
        avgSessionSeconds: avgFocusSession,
        subjectDistribution: Object.entries(focusSubjectMap).map(([subject, seconds]) => ({
          subject,
          seconds,
          hours: parseFloat(((seconds as number) / 3600).toFixed(1)),
          percentage: totalFocusSeconds > 0
            ? parseFloat((((seconds as number) / totalFocusSeconds) * 100).toFixed(1))
            : 0,
        })).sort((a, b) => b.seconds - a.seconds),
        dailyFocus: Object.entries(dailyFocusMap).map(([date, seconds]) => ({
          date,
          seconds,
          hours: parseFloat(((seconds as number) / 3600).toFixed(1)),
        })).sort((a, b) => a.date.localeCompare(b.date)),
        focusStreak,
        daysWithFocus: focusDaysWithActivity.size,
        daysMeetingGoal: focusDaysMeetingGoal,
      },

      // ─── Journal Report ────────────────────────────────────────────────
      journal: {
        entriesCount: journalCount,
        avgMood: moodCount > 0 ? parseFloat((totalMood / moodCount).toFixed(1)) : null,
        avgEnergy: energyCount > 0 ? parseFloat((totalEnergy / energyCount).toFixed(1)) : null,
        avgFocus: focusJCount > 0 ? parseFloat((totalFocusJ / focusJCount).toFixed(1)) : null,
        totalWins,
        totalMistakes,
        moodTrend: moodTrend.sort((a, b) => a.date.localeCompare(b.date)),
      },

      // ─── Revision Report ───────────────────────────────────────────────
      revision: {
        totalTopics: allTopics.length,
        activeTopics: allTopics.filter(t => t.status === 'active').length,
        masteredTopics: allTopics.filter(t => t.status === 'mastered').length,
        masteredInRange,
        totalReviewsInRange,
        avgReviewConfidence,
        dailyReviews: Object.entries(dailyReviewMap).map(([date, count]) => ({
          date,
          count,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        subjectStats: Object.entries(revisionSubjects).map(([subject, data]) => ({
          subject,
          total: data.total,
          mastered: data.mastered,
          avgConf: data.total > 0 ? parseFloat((data.confSum / data.total).toFixed(1)) : 0,
        })).sort((a, b) => b.total - a.total),
      },
    };

    await setCache(cacheKey, responseData, 3600);
    res.json(responseData);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
