import { Request, Response } from 'express';
import DailyJournalModel from '../models/DailyJournal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0];

// @desc    Create or upsert today's journal entry
// @route   POST /api/journal
export const createOrUpdateJournal = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date, summary, mood, energy, focus, wins, mistakes, notes, tags } = req.body;

  try {
    const dateKey = date || todayKey();

    // Check if entry exists for this date
    const existing = await DailyJournalModel.findByUserDate(user._id, dateKey);

    if (existing) {
      // Upsert — update the existing entry
      if (summary !== undefined) existing.summary = summary;
      if (mood !== undefined) existing.mood = mood;
      if (energy !== undefined) existing.energy = energy;
      if (focus !== undefined) existing.focus = focus;
      if (wins !== undefined) existing.wins = wins;
      if (mistakes !== undefined) existing.mistakes = mistakes;
      if (notes !== undefined) existing.notes = notes;
      if (tags !== undefined) existing.tags = tags;

      const updated = await existing.save();
      return res.json(updated);
    }

    // Create new entry
    const journal = await DailyJournalModel.create({
      userId: user._id,
      date: dateKey,
      summary,
      mood,
      energy,
      focus,
      wins,
      mistakes,
      notes,
      tags,
    });

    res.status(201).json(journal);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get today's journal
// @route   GET /api/journal/today
export const getTodayJournal = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findByUserDate(user._id, todayKey());
    if (!journal) {
      return res.json(null);
    }
    res.json(journal);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get journal for a specific date
// @route   GET /api/journal/date/:date
export const getJournalByDate = async (req: Request, res: Response) => {
  const { date } = req.params;
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findByUserDate(user._id, date);
    if (!journal) {
      return res.json(null);
    }
    res.json(journal);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get journal history (paginated)
// @route   GET /api/journal/history
export const getJournalHistory = async (req: Request, res: Response) => {
  const { limit, offset } = req.query;
  const user = (req as any).user;

  try {
    const journals = await DailyJournalModel.findHistory(
      user._id,
      parseInt(limit as string) || 30,
      parseInt(offset as string) || 0
    );
    res.json(journals);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a journal entry
// @route   PUT /api/journal/:id
export const updateJournal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const { summary, mood, energy, focus, wins, mistakes, notes, tags } = req.body;

  try {
    const journal = await DailyJournalModel.findById(id);
    if (!journal || journal.userId !== user._id) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    if (summary !== undefined) journal.summary = summary;
    if (mood !== undefined) journal.mood = mood;
    if (energy !== undefined) journal.energy = energy;
    if (focus !== undefined) journal.focus = focus;
    if (wins !== undefined) journal.wins = wins;
    if (mistakes !== undefined) journal.mistakes = mistakes;
    if (notes !== undefined) journal.notes = notes;
    if (tags !== undefined) journal.tags = tags;

    const updated = await journal.save();
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add studied subjects to a journal entry
// @route   POST /api/journal/:id/subjects
export const addSubjects = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subjects } = req.body;
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findById(id);
    if (!journal || journal.userId !== user._id) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Subjects must be a non-empty array' });
    }

    const added = await DailyJournalModel.addSubjects(id, subjects);
    res.status(201).json(added);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add solved problems to a journal entry
// @route   POST /api/journal/:id/problems
export const addProblems = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { problems } = req.body;
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findById(id);
    if (!journal || journal.userId !== user._id) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    if (!Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({ message: 'Problems must be a non-empty array' });
    }

    const added = await DailyJournalModel.addProblems(id, problems);
    res.status(201).json(added);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get subjects for a journal entry
// @route   GET /api/journal/:id/subjects
export const getSubjects = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findById(id);
    if (!journal || journal.userId !== user._id) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    const subjects = await DailyJournalModel.getSubjects(id);
    res.json(subjects);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get problems for a journal entry
// @route   GET /api/journal/:id/problems
export const getProblems = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const journal = await DailyJournalModel.findById(id);
    if (!journal || journal.userId !== user._id) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    const problems = await DailyJournalModel.getProblems(id);
    res.json(problems);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
