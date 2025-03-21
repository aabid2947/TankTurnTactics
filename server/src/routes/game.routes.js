import express from 'express';
import gameController from '../controllers/game.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, gameSchemas } from '../middleware/validation.middleware.js';

const router = express.Router();

// All game routes require authentication
router.use(protect);

// Game routes
router.post('/', gameController.createGame);
router.get('/', gameController.getAllGames);
router.get('/:id', gameController.getGameById);
router.post('/:id/join', gameController.joinGame);
router.post('/:id/leave', gameController.leaveGame);
router.post('/:id/start', gameController.startGame);
router.post('/:id/end', gameController.endGame);
router.post('/:id/chat', gameController.addChatMessage);

// Game action routes
router.post('/:id/move', validate(gameSchemas.move), gameController.movePlayer);
router.post('/:id/shoot', validate(gameSchemas.shoot), gameController.shootPlayer);
router.post('/:id/upgrade', validate(gameSchemas.upgrade), gameController.upgradeRange);
router.post('/:id/trade', validate(gameSchemas.trade), gameController.tradeActionPoints);

// Game history route
// router.get('/:id/history', gameController.getGameHistory);

export default router; 
