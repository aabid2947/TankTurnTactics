import express from 'express';
import authController from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, userSchemas } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', validate(userSchemas.register), authController.register);
router.post('/login', validate(userSchemas.login), authController.login);

// Protected routes
router.use(protect);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.put('/password', validate(userSchemas.updateProfile), authController.updatePassword);

export default router; 