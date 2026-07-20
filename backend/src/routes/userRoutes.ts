import express from 'express';
import { getUserCategories, updateUserCategories, getUserProfile, updateUserProfile } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/categories')
  .get(protect, getUserCategories)
  .put(protect, updateUserCategories);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
