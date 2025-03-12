import express from 'express';
import userController from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

// User routes
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);
router.get('/stats', userController.getUserStats);
router.get('/games', userController.getUserGames);
router.get('/top', userController.getTopUsers);

export default router; 