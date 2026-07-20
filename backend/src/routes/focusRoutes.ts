import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  getSessions,
  getSession,
  getActiveSession,
  getTodayStats,
  getWeeklyStats,
  getHeatmap,
  getSubjectDistribution,
  setGoal,
  getStreak,
} from '../controllers/focusController';

const router = Router();

// Session lifecycle
router.post('/start', protect, startSession);
router.post('/pause/:id', protect, pauseSession);
router.post('/resume/:id', protect, resumeSession);
router.post('/stop/:id', protect, stopSession);

// Session queries
router.get('/active', protect, getActiveSession);
router.get('/sessions', protect, getSessions);
router.get('/sessions/:id', protect, getSession);

// Stats & analytics
router.get('/stats/today', protect, getTodayStats);
router.get('/stats/weekly', protect, getWeeklyStats);
router.get('/stats/heatmap', protect, getHeatmap);
router.get('/stats/subjects', protect, getSubjectDistribution);

// Goal & streak
router.put('/goal', protect, setGoal);
router.get('/streak', protect, getStreak);

export default router;
