import redisClient from '../config/redis.js';

/**
 * Game service using Redis for data storage
 */
class GameRedisService {
  /**
   * Create a new game
   * @param {Object} gameData - Game data
   * @param {string} userId - User ID of the creator
   * @returns {Promise<Object>} - Created game
   */
  async createGame(gameData, userId) {
    const gameId = `game:${Date.now()}`; // Use a timestamp for unique game ID
    const game = {
      ...gameData,
      createdBy: userId,
      status: 'waiting',
      players: [],
      actionHistory: [],
      chatHistory: [],
      createdAt: new Date().toISOString(),
    };

    // Store game in Redis
    await redisClient.set(gameId, game);

    // Add game to games set
    await redisClient.sadd('games', gameId);

    return { id: gameId, ...game };
  }

  /**
   * Get a game by ID
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} - Game data or null if not found
   */
  async getGameById(gameId) {
    return await redisClient.get(gameId);
  }

  /**
   * Add a player to a game
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated game
   */
  async addPlayerToGame(gameId, userId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.players.push({ userId, joinedAt: new Date().toISOString() });

    await redisClient.set(gameId, game);
    return game;
  }

  /**
   * Start a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game
   */
  async startGame(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.status = 'active';
    game.startedAt = new Date().toISOString();

    await redisClient.set(gameId, game);
    return game;
  }

  /**
   * Add an action to the game history
   * @param {string} gameId - Game ID
   * @param {Object} action - Action data
   * @returns {Promise<Object>} - Updated game
   */
  async addGameAction(gameId, action) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.actionHistory.push(action);

    await redisClient.set(gameId, game);
    return game;
  }

  /**
   * Add a chat message to the game
   * @param {string} gameId - Game ID
   * @param {Object} message - Message data
   * @returns {Promise<Object>} - Updated game
   */
  async addChatMessage(gameId, message) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.chatHistory.push(message);

    await redisClient.set(gameId, game);
    return game;
  }

  /**
   * End a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game
   */
  async endGame(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.status = 'completed';
    game.endedAt = new Date().toISOString();

    await redisClient.set(gameId, game);
    return game;
  }

  /**
   * Get all games
   * @returns {Promise<Array>} - Array of all games
   */
  async getAllGames() {
    const gameIds = await redisClient.smembers('games');
    const games = await Promise.all(
      gameIds.map(async (gameId) => {
        const game = await this.getGameById(gameId);
        return game;
      })
    );
    return games.filter(game => game !== null);
  }
}

// Create and export a singleton instance
const gameRedisService = new GameRedisService();
export default gameRedisService; 