import { v4 as uuidv4 } from 'uuid';
import redisClient from '../config/redis.js';

// Key prefixes for Redis
const KEYS = {
  GAME: 'game:',
  GAME_LIST: 'games',
  GAME_BY_STATUS: 'games:status:',
  PLAYER_GAMES: 'player:games:',
  GAME_PLAYERS: 'game:players:',
  GAME_ACTIONS: 'game:actions:',
  GAME_CHAT: 'game:chat:'
};

/**
 * Game repository for Redis
 */
class GameRepository {
  /**
   * Create a new game
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} - Created game
   */
  async createGame(gameData) {
    try {
      const gameId = uuidv4();
      const timestamp = Date.now();
      
      const game = {
        id: gameId,
        name: gameData.name,
        status: 'waiting',
        boardSize: {
          width: 20,
          height: 20
        },
        currentBoardSize: {
          width: 20,
          height: 20
        },
        players: [],
        maxPlayers: gameData.maxPlayers || 10,
        actionHistory: [],
        chatHistory: [],
        createdBy: gameData.createdBy,
        createdAt: timestamp,
        lastActionAt: timestamp,
        settings: {
          apPerTurn: gameData.settings?.apPerTurn || 1,
          apCostMove: gameData.settings?.apCostMove || 1,
          apCostShoot: gameData.settings?.apCostShoot || 1,
          apCostUpgrade: gameData.settings?.apCostUpgrade || 3,
          damagePerShot: gameData.settings?.damagePerShot || 25,
          boardShrinkInterval: gameData.settings?.boardShrinkInterval || 10,
          turnDuration: gameData.settings?.turnDuration || 60
        }
      };
      
      // Store game data
      await redisClient.set(`${KEYS.GAME}${gameId}`, game);
      
      // Add to game list
      await redisClient.sadd(KEYS.GAME_LIST, gameId);
      
      // Add to status-based list
      await redisClient.sadd(`${KEYS.GAME_BY_STATUS}waiting`, gameId);
      
      // Add to creator's games
      await redisClient.sadd(`${KEYS.PLAYER_GAMES}${gameData.createdBy}`, gameId);
      
      return game;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }
  
  /**
   * Get a game by ID
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} - Game data or null if not found
   */
  async getGameById(gameId) {
    try {
      return await redisClient.get(`${KEYS.GAME}${gameId}`);
    } catch (error) {
      console.error(`Error getting game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get games by status
   * @param {string} status - Game status
   * @param {number} limit - Maximum number of games to return
   * @param {number} page - Page number
   * @returns {Promise<Object>} - Games and pagination info
   */
  async getGamesByStatus(status, limit = 10, page = 1) {
    try {
      const skip = (page - 1) * limit;
      
      // Get game IDs by status
      let gameIds;
      if (status) {
        gameIds = await redisClient.smembers(`${KEYS.GAME_BY_STATUS}${status}`);
      } else {
        gameIds = await redisClient.smembers(KEYS.GAME_LIST);
      }
      
      // Get total count
      const total = gameIds.length;
      
      // Apply pagination
      const paginatedIds = gameIds.slice(skip, skip + limit);
      
      // Get game data for each ID
      const games = [];
      for (const id of paginatedIds) {
        const game = await this.getGameById(id);
        if (game) {
          games.push(game);
        }
      }
      
      // Sort by creation date (newest first)
      games.sort((a, b) => b.createdAt - a.createdAt);
      
      return {
        games,
        count: games.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      console.error(`Error getting games by status ${status}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a game
   * @param {string} gameId - Game ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async updateGame(gameId, updateData) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Check if status is changing
      const statusChanged = updateData.status && updateData.status !== game.status;
      
      // Update game data
      const updatedGame = {
        ...game,
        ...updateData,
        lastActionAt: Date.now()
      };
      
      // Store updated game
      await redisClient.set(`${KEYS.GAME}${gameId}`, updatedGame);
      
      // Update status-based lists if status changed
      if (statusChanged) {
        await redisClient.srem(`${KEYS.GAME_BY_STATUS}${game.status}`, gameId);
        await redisClient.sadd(`${KEYS.GAME_BY_STATUS}${updateData.status}`, gameId);
      }
      
      return updatedGame;
    } catch (error) {
      console.error(`Error updating game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a player to a game
   * @param {string} gameId - Game ID
   * @param {Object} playerData - Player data
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async addPlayerToGame(gameId, playerData) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Check if game is joinable
      if (game.status !== 'waiting') {
        throw new Error('Game has already started or ended');
      }
      
      // Check if player limit reached
      if (game.players.length >= game.maxPlayers) {
        throw new Error('Game is full');
      }
      
      // Check if player already joined
      if (game.players.some(player => player.user === playerData.user)) {
        throw new Error('You have already joined this game');
      }
      
      // Generate random position that is not occupied
      let position;
      do {
        position = {
          x: Math.floor(Math.random() * game.boardSize.width),
          y: Math.floor(Math.random() * game.boardSize.height)
        };
      } while (game.players.some(player => 
        player.position.x === position.x && player.position.y === position.y
      ));
      
      // Create player object
      const player = {
        user: playerData.user,
        position,
        health: 100,
        actionPoints: game.settings.apPerTurn,
        range: 3,
        isAlive: true,
        kills: 0,
        deaths: 0,
        lastAction: Date.now()
      };
      
      // Add player to game
      const updatedPlayers = [...game.players, player];
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { players: updatedPlayers });
      
      // Add game to player's games
      await redisClient.sadd(`${KEYS.PLAYER_GAMES}${playerData.user}`, gameId);
      
      // Add player to game's players
      await redisClient.sadd(`${KEYS.GAME_PLAYERS}${gameId}`, playerData.user);
      
      return updatedGame;
    } catch (error) {
      console.error(`Error adding player to game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Start a game
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID of the game creator
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async startGame(gameId, userId) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Check if user is the creator
      if (game.createdBy !== userId) {
        throw new Error('Only the game creator can start the game');
      }
      
      // Check if game can be started
      if (game.status !== 'waiting') {
        throw new Error('Game has already started or ended');
      }
      
      // Check if there are enough players
      if (game.players.length < 2) {
        throw new Error('At least 2 players are required to start the game');
      }
      
      // Update game status
      const timestamp = Date.now();
      const updatedGame = await this.updateGame(gameId, {
        status: 'active',
        startedAt: timestamp,
        lastActionAt: timestamp
      });
      
      return updatedGame;
    } catch (error) {
      console.error(`Error starting game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add an action to a game's history
   * @param {string} gameId - Game ID
   * @param {Object} action - Action data
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async addGameAction(gameId, action) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Add timestamp if not provided
      const actionWithTimestamp = {
        ...action,
        timestamp: action.timestamp || Date.now()
      };
      
      // Add action to history
      const updatedActions = [...game.actionHistory, actionWithTimestamp];
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { 
        actionHistory: updatedActions,
        lastActionAt: actionWithTimestamp.timestamp
      });
      
      // Also store in a separate list for faster access
      await redisClient.rpush(`${KEYS.GAME_ACTIONS}${gameId}`, actionWithTimestamp);
      
      return updatedGame;
    } catch (error) {
      console.error(`Error adding action to game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a chat message to a game
   * @param {string} gameId - Game ID
   * @param {Object} message - Chat message data
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async addChatMessage(gameId, message) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Add timestamp if not provided
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || Date.now()
      };
      
      // Add message to history
      const updatedChat = [...game.chatHistory, messageWithTimestamp];
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { 
        chatHistory: updatedChat
      });
      
      // Also store in a separate list for faster access
      await redisClient.rpush(`${KEYS.GAME_CHAT}${gameId}`, messageWithTimestamp);
      
      return updatedGame;
    } catch (error) {
      console.error(`Error adding chat message to game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a player's games
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} - Array of games
   */
  async getPlayerGames(userId) {
    try {
      // Get game IDs for player
      const gameIds = await redisClient.smembers(`${KEYS.PLAYER_GAMES}${userId}`);
      
      // Get game data for each ID
      const games = [];
      for (const id of gameIds) {
        const game = await this.getGameById(id);
        if (game) {
          games.push(game);
        }
      }
      
      // Sort by last action date (newest first)
      games.sort((a, b) => b.lastActionAt - a.lastActionAt);
      
      return games;
    } catch (error) {
      console.error(`Error getting games for player ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get game action history
   * @param {string} gameId - Game ID
   * @param {number} limit - Maximum number of actions to return
   * @param {number} page - Page number
   * @returns {Promise<Object>} - Actions and pagination info
   */
  async getGameHistory(gameId, limit = 20, page = 1) {
    try {
      // Get total count
      const total = await redisClient.llen(`${KEYS.GAME_ACTIONS}${gameId}`);
      
      // Calculate start and end indices
      const start = Math.max(0, total - (page * limit));
      const end = Math.max(0, total - ((page - 1) * limit) - 1);
      
      // Get actions
      const actions = await redisClient.lrange(`${KEYS.GAME_ACTIONS}${gameId}`, start, end);
      
      // Reverse to get newest first
      actions.reverse();
      
      return {
        history: actions,
        count: actions.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      console.error(`Error getting history for game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a player in a game
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async updatePlayer(gameId, userId, updateData) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return null;
      }
      
      // Find player
      const playerIndex = game.players.findIndex(player => player.user === userId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found in game');
      }
      
      // Update player data
      const updatedPlayers = [...game.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        ...updateData,
        lastAction: Date.now()
      };
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { 
        players: updatedPlayers
      });
      
      return updatedGame;
    } catch (error) {
      console.error(`Error updating player ${userId} in game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if a game is over
   * @param {string} gameId - Game ID
   * @returns {Promise<{isOver: boolean, winner: string|null}>} - Game over status and winner
   */
  async checkGameOver(gameId) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      // If game is already completed, return
      if (game.status === 'completed') {
        return {
          isOver: true,
          winner: game.winner
        };
      }
      
      // Get active players
      const activePlayers = game.players.filter(player => player.isAlive);
      
      // Check if game is over
      if (activePlayers.length <= 1) {
        // Determine winner
        const winner = activePlayers.length === 1 ? activePlayers[0].user : null;
        
        // Update game
        const timestamp = Date.now();
        await this.updateGame(gameId, {
          status: 'completed',
          endedAt: timestamp,
          winner,
          lastActionAt: timestamp
        });
        
        return {
          isOver: true,
          winner
        };
      }
      
      return {
        isOver: false,
        winner: null
      };
    } catch (error) {
      console.error(`Error checking if game ${gameId} is over:`, error);
      throw error;
    }
  }
  
  /**
   * Distribute action points to all players in a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async distributeActionPoints(gameId) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game || game.status !== 'active') {
        return null;
      }
      
      // Update players
      const updatedPlayers = game.players.map(player => {
        if (player.isAlive) {
          return {
            ...player,
            actionPoints: player.actionPoints + game.settings.apPerTurn
          };
        }
        return player;
      });
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { 
        players: updatedPlayers,
        lastActionAt: Date.now()
      });
      
      return updatedGame;
    } catch (error) {
      console.error(`Error distributing action points for game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Shrink the game board
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} - Updated game or null if not found
   */
  async shrinkBoard(gameId) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game || game.status !== 'active') {
        return null;
      }
      
      // Shrink board by 1 in each dimension
      const newWidth = Math.max(5, game.currentBoardSize.width - 1);
      const newHeight = Math.max(5, game.currentBoardSize.height - 1);
      
      // Update players that are outside the new boundaries
      const updatedPlayers = game.players.map(player => {
        if (player.isAlive) {
          const newX = Math.min(player.position.x, newWidth - 1);
          const newY = Math.min(player.position.y, newHeight - 1);
          
          if (newX !== player.position.x || newY !== player.position.y) {
            return {
              ...player,
              position: { x: newX, y: newY }
            };
          }
        }
        return player;
      });
      
      // Add board shrink to action history
      const timestamp = Date.now();
      const shrinkAction = {
        actionType: 'boardShrink',
        details: {
          width: newWidth,
          height: newHeight
        },
        timestamp
      };
      
      // Update game
      const updatedGame = await this.updateGame(gameId, { 
        currentBoardSize: { width: newWidth, height: newHeight },
        players: updatedPlayers,
        lastActionAt: timestamp
      });
      
      // Add action to history
      await this.addGameAction(gameId, shrinkAction);
      
      return updatedGame;
    } catch (error) {
      console.error(`Error shrinking board for game ${gameId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a game
   * @param {string} gameId - Game ID
   * @returns {Promise<boolean>} - Whether the game was deleted
   */
  async deleteGame(gameId) {
    try {
      // Get current game data
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return false;
      }
      
      // Remove from game list
      await redisClient.srem(KEYS.GAME_LIST, gameId);
      
      // Remove from status-based list
      await redisClient.srem(`${KEYS.GAME_BY_STATUS}${game.status}`, gameId);
      
      // Remove from players' games
      for (const player of game.players) {
        await redisClient.srem(`${KEYS.PLAYER_GAMES}${player.user}`, gameId);
      }
      
      // Remove creator's game
      await redisClient.srem(`${KEYS.PLAYER_GAMES}${game.createdBy}`, gameId);
      
      // Remove game's players
      await redisClient.del(`${KEYS.GAME_PLAYERS}${gameId}`);
      
      // Remove game actions
      await redisClient.del(`${KEYS.GAME_ACTIONS}${gameId}`);
      
      // Remove game chat
      await redisClient.del(`${KEYS.GAME_CHAT}${gameId}`);
      
      // Remove game data
      await redisClient.del(`${KEYS.GAME}${gameId}`);
      
      return true;
    } catch (error) {
      console.error(`Error deleting game ${gameId}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const gameRepository = new GameRepository();

export default gameRepository; 