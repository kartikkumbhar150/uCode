import express from 'express';
import { createTask, getTasks, markTaskCompleted, updateTask, deleteTask } from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, createTask)
  .get(protect, getTasks);

// PUT is allowed only for completion, not for renaming. Immutable rule.
router.put('/:id/complete', protect, markTaskCompleted);

// Restricted routes — 403 Forbidden
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

export default router;
