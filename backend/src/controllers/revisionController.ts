import { Request, Response } from 'express';
import LearningTopic, { computeNextReview } from '../models/LearningTopic';
import TopicReview from '../models/TopicReview';

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Topics CRUD ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Add a new learning topic (auto-schedules first revision in 2 days)
// @route   POST /api/revision/topics
export const createTopic = async (req: Request, res: Response) => {
  const { title, subject, description, difficulty, importance } = req.body;
  const user = (req as any).user;

  try {
    if (!title || !subject || !difficulty) {
      return res.status(400).json({
        message: 'title, subject, and difficulty are required',
      });
    }

    const topic = await LearningTopic.create({
      userId: user._id,
      title,
      subject,
      description,
      difficulty,
      importance,
    });

    res.status(201).json(topic);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all topics for user
// @route   GET /api/revision/topics
export const getTopics = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const topics = await LearningTopic.findByUser(user._id);
    res.json(topics);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single topic by ID
// @route   GET /api/revision/topics/:id
export const getTopic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const topic = await LearningTopic.findById(id);
    if (!topic || topic.userId !== user._id) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Fetch review history for this topic
    const reviews = await TopicReview.findByTopic(id);

    res.json({ ...topic, reviews });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a topic
// @route   PUT /api/revision/topics/:id
export const updateTopic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, subject, description, difficulty, importance, status } = req.body;
  const user = (req as any).user;

  try {
    const topic = await LearningTopic.findById(id);
    if (!topic || topic.userId !== user._id) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (title) topic.title = title;
    if (subject) topic.subject = subject;
    if (description !== undefined) topic.description = description;
    if (difficulty) topic.difficulty = difficulty;
    if (importance) topic.importance = importance;
    if (status) topic.status = status;

    const updated = await topic.save();
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a topic
// @route   DELETE /api/revision/topics/:id
export const deleteTopic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const topic = await LearningTopic.findById(id);
    if (!topic || topic.userId !== user._id) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    await LearningTopic.deleteById(id);
    res.json({ message: 'Topic deleted' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Revision ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Get topics due for revision today
// @route   GET /api/revision/due
export const getDueTopics = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const due = await LearningTopic.findDue(user._id);
    res.json(due);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Submit a review — adaptive spaced repetition recalculates next review
// @route   POST /api/revision/review/:topicId
export const submitReview = async (req: Request, res: Response) => {
  const { topicId } = req.params;
  const { confidence, notes } = req.body;
  const user = (req as any).user;

  try {
    if (!confidence || confidence < 1 || confidence > 5) {
      return res.status(400).json({ message: 'confidence must be 1-5' });
    }

    const topic = await LearningTopic.findById(topicId);
    if (!topic || topic.userId !== user._id) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Compute next review using adaptive algorithm
    const { nextReviewAt, newIntervalDays } = computeNextReview(
      topic.reviewCount,
      confidence,
      topic.currentIntervalDays
    );

    // Create review record
    const review = await TopicReview.create({
      topicId,
      userId: user._id,
      confidence,
      notes,
      nextReviewAt,
    });

    // Update topic
    topic.confidence = confidence;
    topic.reviewCount += 1;
    topic.lastReviewedAt = new Date();
    topic.nextReviewAt = nextReviewAt;
    topic.currentIntervalDays = newIntervalDays;

    // Auto-mark mastered if confidence is consistently 5 and reviewed 5+ times
    if (confidence >= 5 && topic.reviewCount >= 5) {
      topic.status = 'mastered';
    }

    const updated = await topic.save();

    res.json({
      topic: updated,
      review,
      nextReviewAt,
      nextIntervalDays: newIntervalDays,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get full review history for the user
// @route   GET /api/revision/history
export const getReviewHistory = async (req: Request, res: Response) => {
  const { limit } = req.query;
  const user = (req as any).user;

  try {
    const reviews = await TopicReview.findByUser(
      user._id,
      parseInt(limit as string) || 50
    );
    res.json(reviews);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Queue & Stats ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Get revision queue counts (due today / tomorrow / this week)
// @route   GET /api/revision/queue
export const getQueue = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const queue = await LearningTopic.getQueue(user._id);
    res.json(queue);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Knowledge tree — topics grouped by subject
// @route   GET /api/revision/tree
export const getKnowledgeTree = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const allTopics = await LearningTopic.findByUser(user._id);

    // Group by subject
    const tree: {
      [subject: string]: {
        total: number;
        mastered: number;
        active: number;
        topics: {
          _id: string;
          title: string;
          status: string;
          confidence: number;
          nextReviewAt: Date | null | undefined;
        }[];
      };
    } = {};

    allTopics.forEach((t) => {
      if (!tree[t.subject]) {
        tree[t.subject] = { total: 0, mastered: 0, active: 0, topics: [] };
      }
      tree[t.subject].total++;
      if (t.status === 'mastered') tree[t.subject].mastered++;
      if (t.status === 'active') tree[t.subject].active++;

      tree[t.subject].topics.push({
        _id: t._id,
        title: t.title,
        status: t.status,
        confidence: t.confidence,
        nextReviewAt: t.nextReviewAt,
      });
    });

    res.json(tree);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Revision stats summary
// @route   GET /api/revision/stats
export const getRevisionStats = async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const allTopics = await LearningTopic.findByUser(user._id);
    const totalReviews = await TopicReview.countByUser(user._id);
    const queue = await LearningTopic.getQueue(user._id);

    const totalTopics = allTopics.length;
    const mastered = allTopics.filter((t) => t.status === 'mastered').length;
    const active = allTopics.filter((t) => t.status === 'active').length;
    const archived = allTopics.filter((t) => t.status === 'archived').length;
    const avgConfidence = totalTopics > 0
      ? parseFloat(
          (allTopics.reduce((sum, t) => sum + t.confidence, 0) / totalTopics).toFixed(1)
        )
      : 0;

    // Subjects breakdown
    const subjects: { [key: string]: number } = {};
    allTopics.forEach((t) => {
      subjects[t.subject] = (subjects[t.subject] || 0) + 1;
    });

    res.json({
      totalTopics,
      mastered,
      active,
      archived,
      totalReviews,
      avgConfidence,
      subjectsBreakdown: subjects,
      queue,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Search topics by title, subject, or description
// @route   GET /api/revision/search
export const searchTopics = async (req: Request, res: Response) => {
  const { q } = req.query;
  const user = (req as any).user;

  try {
    if (!q || (q as string).trim().length === 0) {
      return res.status(400).json({ message: 'Search query "q" is required' });
    }

    const results = await LearningTopic.search(user._id, q as string);
    res.json(results);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
