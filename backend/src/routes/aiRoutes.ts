import express from 'express';
import { getAIInsights } from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/insights', protect, getAIInsights);

export default router;
