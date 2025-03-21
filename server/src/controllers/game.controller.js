import gameRedisService from '../services/game-redis.service.js';
import userRedisService from '../services/user-redis.service.js';
import loggerObj from '../utils/logger.js';

/**
 * Game controller
 */

const {logger} = loggerObj;
class GameController {
  constructor() {
    this.createGame = this.createGame.bind(this);
  }
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
      const updatedGame = await gameRedisService.addPlayerToGame(game.id, userId);
      
      logger.info(`Game created: ${game.id}`, { userId, gameId: game.id });
      
      res.status(201).json({
        success: true,
        data: {gameId:game.id, ...updatedGame}
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
        data:  { id: id, ...game }
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
      console.log(typeof(game))
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
      
      const finalizeGame = await gameRedisService.getGameById(id)

      

      logger.info(`Player joined game: ${id}`, { userId, gameId: id });
      
      res.status(200).json({
        success: true,
        data: {gameId:id, ...finalizeGame}
      });
    } catch (error) {
      logger.error(`Join game error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to join game'
      });
    }
  }

  async leaveGame(req, res) {
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
      
      
      // Check if player is  in the game
      const isPlayerInGame = game.players.some(player => player.userId === userId);
      if (!isPlayerInGame) {
        return res.status(200).json({
          success: true,
          error: 'You are not in the game'
        });
      }
      
     
      // Add player to game
      const updatedGame = await gameRedisService.removePlayerFromGame(id, userId);
      
      logger.info(`Player leaved game: ${id}`, { userId, gameId: id });
      
      res.status(200).json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error(`Leave game error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to leave the game'
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
  
  // =======================================================
  //                   Game Actions Section
  // =======================================================
  
  /**
   * Move a player to a new position.
   * Implements rules: cost 1 AP, move must be adjacent, target cell must be unoccupied, and within board boundaries.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async movePlayer(req, res) {
    try {
      const { id } = req.params; // Game ID
      const { newX, newY } = req.body; // New position coordinates
      const userId = req.user.id;
      
      // Retrieve the game state
      const game = await gameRedisService.getGameById(id);
      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }
      
      // Check if move is valid using game logic (e.g., adjacent cell, within board, and not occupied)
      // For example: calculate Manhattan distance and check for occupancy
      // Assume gameRedisService has helper functions: isAdjacent and isCellOccupied.
      const currentPlayer = game.players.find(player => player.userId === userId);
      if (!currentPlayer) {
        return res.status(403).json({ success: false, error: 'Player not part of this game' });
      }
      
      // Check if new position is adjacent (Manhattan distance === 1)
      const distance = Math.abs(currentPlayer.position.x - newX) + Math.abs(currentPlayer.position.y - newY);
      if (distance !== 1) {
        return res.status(400).json({ success: false, error: 'Invalid move: Must move to an adjacent cell' });
      }
      
      // Check if the new cell is within board boundaries and not occupied
      if (!gameRedisService.isWithinBoard(id, newX, newY) || await gameRedisService.isCellOccupied(id, newX, newY)) {
        return res.status(400).json({ success: false, error: 'Invalid move: Target cell is either out of bounds or occupied' });
      }
      
      // Deduct AP (cost of 1) and update player's position
      const updatedGame = await gameRedisService.movePlayer(id, userId, newX, newY);
      
      logger.info(`Player ${userId} moved to (${newX}, ${newY}) in game ${id}`);
      
      res.status(200).json({ success: true, data: updatedGame });
    } catch (error) {
      logger.error(`Move player error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to move player' });
    }
  }
  
  /**
   * Player shoots at a target.
   * Implements rules: cost 1 AP, target must be within shooting range, and deducts health from the target.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async shootPlayer(req, res) {
    try {
      const { id } = req.params; // Game ID
      const { targetX, targetY } = req.body; // Target coordinates
      const userId = req.user.id;
      
      // Retrieve the game state
      const game = await gameRedisService.getGameById(id);
      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }
      
      // Check if shooter is in the game and has enough AP (cost 1)
      const shooter = game.players.find(player => player.userId === userId);
      if (!shooter) {
        return res.status(403).json({ success: false, error: 'Player not part of this game' });
      }
      
      // Validate target is within shooting range (using Manhattan distance and shooter’s current range)
      const distance = Math.abs(shooter.position.x - targetX) + Math.abs(shooter.position.y - targetY);
      if (distance > shooter.range) {
        return res.status(400).json({ success: false, error: 'Invalid shoot: Target out of range' });
      }
      
      // Execute shoot action: Deduct AP, remove 1 heart from target, and update kill/death stats as applicable.
      const updatedGame = await gameRedisService.shootPlayer(id, userId, targetX, targetY);
      
      logger.info(`Player ${userId} shot at (${targetX}, ${targetY}) in game ${id}`);
      
      res.status(200).json({ success: true, data: updatedGame });
    } catch (error) {
      logger.error(`Shoot player error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to execute shoot action' });
    }
  }
  
  /**
   * Upgrade the player's shooting range.
   * Implements rules: cost 3 AP to increase range by 1.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async upgradeRange(req, res) {
    try {
      const { id } = req.params; // Game ID
      const userId = req.user.id;
      
      // Retrieve game state
      const game = await gameRedisService.getGameById(id);
      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }
      
      // Validate player existence and AP (cost 3)
      const player = game.players.find(player => player.userId === userId);
      if (!player) {
        return res.status(403).json({ success: false, error: 'Player not part of this game' });
      }
      
      // Execute upgrade: Deduct AP and increase the player's shooting range
      const updatedGame = await gameRedisService.upgradeRange(id, userId);
      
      logger.info(`Player ${userId} upgraded range in game ${id}`);
      
      res.status(200).json({ success: true, data: updatedGame });
    } catch (error) {
      logger.error(`Upgrade range error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to upgrade range' });
    }
  }
  
  /**
   * Trade action points or hearts with another player.
   * Implements rules: Both players must be within trade range, and the trade is only allowed if both players agree.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async tradeActionPoints(req, res) {
    try {
      const { id } = req.params; // Game ID
      const { targetUserId, type, amount } = req.body; // type can be 'AP' or 'heart'
      const userId = req.user.id;
      
      // Retrieve game state
      const game = await gameRedisService.getGameById(id);
      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }
      
      // Validate both players are part of the game and within trade range
      const initiatingPlayer = game.players.find(player => player.userId === userId);
      const targetPlayer = game.players.find(player => player.userId === targetUserId);
      if (!initiatingPlayer || !targetPlayer) {
        return res.status(403).json({ success: false, error: 'Both players must be part of the game' });
      }
      
      // Assume a helper function exists that checks if players are within trade range.
      if (!gameRedisService.arePlayersWithinTradeRange(id, userId, targetUserId)) {
        return res.status(400).json({ success: false, error: 'Players are not within trade range' });
      }
      
      // Execute trade: Deduct/add AP or hearts based on the trade type.
      const updatedGame = await gameRedisService.tradeActionPoints(id, userId, targetUserId, type, amount);
      
      logger.info(`Player ${userId} traded ${amount} ${type} with player ${targetUserId} in game ${id}`);
      
      res.status(200).json({ success: true, data: updatedGame });
    } catch (error) {
      logger.error(`Trade action error: ${error.message}`, { userId: req.user.id, gameId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to execute trade action' });
    }
  }
}

// Create a singleton instance
const gameController = new GameController();

export default gameController;
