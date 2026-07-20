import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createOrUpdateJournal,
  getTodayJournal,
  getJournalByDate,
  getJournalHistory,
  updateJournal,
  addSubjects,
  addProblems,
  getSubjects,
  getProblems,
} from '../controllers/journalController';

const router = Router();

// Journal CRUD
router.post('/', protect, createOrUpdateJournal);
router.get('/today', protect, getTodayJournal);
router.get('/history', protect, getJournalHistory);
router.get('/date/:date', protect, getJournalByDate);
router.put('/:id', protect, updateJournal);

// Subjects & problems
router.post('/:id/subjects', protect, addSubjects);
router.get('/:id/subjects', protect, getSubjects);
router.post('/:id/problems', protect, addProblems);
router.get('/:id/problems', protect, getProblems);

export default router;
