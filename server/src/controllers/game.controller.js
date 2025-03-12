import gameRedisService from '../services/game-redis.service.js';
import userRedisService from '../services/user-redis.service.js';
import logger from '../utils/logger.js';

/**
 * Game controller
 */
class GameController {
  /**
   * Create a new game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createGame(req, res) {
    try {
      const { name, maxPlayers, boardSize = 20 } = req.body;
      const userId = req.user.id;
      
      const game = await gameRedisService.createGame({
        name,
        maxPlayers: parseInt(maxPlayers) || 4,
        boardSize: parseInt(boardSize) || 20,
        board: this.generateInitialBoard(parseInt(boardSize) || 20)
      }, userId);
      
      // Add creator as first player
      await gameRedisService.addPlayerToGame(game.id, userId);
      
      logger.info(`Game created: ${game.id}`, { userId, gameId: game.id });
      
      res.status(201).json({
        success: true,
        data: game
      });
    } catch (error) {
      logger.error(`Create game error: ${error.message}`, { userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to create game'
      });
    }
  }
  
  /**
   * Get a game by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGameById(req, res) {
    try {
      const { id } = req.params;
      const game = await gameRedisService.getGameById(id);
      
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: game
      });
    } catch (error) {
      logger.error(`Get game error: ${error.message}`, { gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get game'
      });
    }
  }
  
  /**
   * Get all games
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllGames(req, res) {
    try {
      const games = await gameRedisService.getAllGames();
      
      res.status(200).json({
        success: true,
        count: games.length,
        data: games
      });
    } catch (error) {
      logger.error(`Get all games error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get games'
      });
    }
  }
  
  /**
   * Join a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async joinGame(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const game = await gameRedisService.getGameById(id);
      
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      // Check if game is joinable
      if (game.status !== 'waiting') {
        return res.status(400).json({
          success: false,
          error: 'Game is not in waiting state'
        });
      }
      
      // Check if player is already in the game
      const isPlayerInGame = game.players.some(player => player.userId === userId);
      if (isPlayerInGame) {
        return res.status(400).json({
          success: false,
          error: 'You are already in this game'
        });
      }
      
      // Check if game is full
      if (game.players.length >= game.maxPlayers) {
        return res.status(400).json({
          success: false,
          error: 'Game is full'
        });
      }
      
      // Add player to game
      const updatedGame = await gameRedisService.addPlayerToGame(id, userId);
      
      logger.info(`Player joined game: ${id}`, { userId, gameId: id });
      
      res.status(200).json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error(`Join game error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to join game'
      });
    }
  }
  
  /**
   * Start a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startGame(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const game = await gameRedisService.getGameById(id);
      
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      // Check if user is the creator
      if (game.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the game creator can start the game'
        });
      }
      
      // Check if game is in waiting state
      if (game.status !== 'waiting') {
        return res.status(400).json({
          success: false,
          error: 'Game is not in waiting state'
        });
      }
      
      // Check if there are at least 2 players
      if (game.players.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 players are required to start the game'
        });
      }
      
      // Start the game
      const updatedGame = await gameRedisService.startGame(id);
      
      logger.info(`Game started: ${id}`, { userId, gameId: id });
      
      res.status(200).json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error(`Start game error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to start game'
      });
    }
  }
  
  /**
   * End a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async endGame(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const game = await gameRedisService.getGameById(id);
      
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      // Check if user is the creator
      if (game.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the game creator can end the game'
        });
      }
      
      // Check if game is active
      if (game.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Game is not active'
        });
      }
      
      // End the game
      const updatedGame = await gameRedisService.endGame(id);
      
      logger.info(`Game ended: ${id}`, { userId, gameId: id });
      
      res.status(200).json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error(`End game error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to end game'
      });
    }
  }
  
  /**
   * Add a chat message to a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addChatMessage(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      
      const game = await gameRedisService.getGameById(id);
      
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      // Check if player is in the game
      const isPlayerInGame = game.players.some(player => player.userId === userId);
      if (!isPlayerInGame) {
        return res.status(403).json({
          success: false,
          error: 'You are not a player in this game'
        });
      }
      
      // Add chat message
      const chatMessage = {
        userId,
        message,
        timestamp: new Date().toISOString()
      };
      
      const updatedGame = await gameRedisService.addChatMessage(id, chatMessage);
      
      res.status(200).json({
        success: true,
        data: updatedGame.chatHistory[updatedGame.chatHistory.length - 1]
      });
    } catch (error) {
      logger.error(`Add chat message error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to add chat message'
      });
    }
  }
  
  /**
   * Generate initial game board
   * @param {number} size - Board size
   * @returns {Array} - 2D array representing the board
   */
  generateInitialBoard(size) {
    const board = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        row.push({
          type: 'empty',
          x: j,
          y: i
        });
      }
      board.push(row);
    }
    return board;
  }
}

// Create a singleton instance
const gameController = new GameController();

export default gameController; 