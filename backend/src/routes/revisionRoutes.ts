import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createTopic,
  getTopics,
  getTopic,
  updateTopic,
  deleteTopic,
  getDueTopics,
  submitReview,
  getReviewHistory,
  getQueue,
  getKnowledgeTree,
  getRevisionStats,
  searchTopics,
} from '../controllers/revisionController';

const router = Router();

// Topic CRUD
router.post('/topics', protect, createTopic);
router.get('/topics', protect, getTopics);
router.get('/topics/:id', protect, getTopic);
router.put('/topics/:id', protect, updateTopic);
router.delete('/topics/:id', protect, deleteTopic);

// Revision workflow
router.get('/due', protect, getDueTopics);
router.post('/review/:topicId', protect, submitReview);
router.get('/history', protect, getReviewHistory);

// Queue, tree, stats, search
router.get('/queue', protect, getQueue);
router.get('/tree', protect, getKnowledgeTree);
router.get('/stats', protect, getRevisionStats);
router.get('/search', protect, searchTopics);

export default router;
