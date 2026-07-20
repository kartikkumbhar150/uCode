import express from 'express';
import { getAnalytics, getWeeklyTrend, getHeatmapData } from '../controllers/analyticsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Specific routes MUST come before parameterized routes
router.get('/weekly-trend', protect, getWeeklyTrend);
router.get('/heatmap', protect, getHeatmapData);

// Generic period route (day, week, etc.)
router.get('/:period', protect, getAnalytics);

export default router;
