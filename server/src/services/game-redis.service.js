import redisClient from '../config/redis.js';
import logObj from '../utils/logger.js';



/**
 * Game service using Redis for data storage
 */

const {logger} = logObj

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper: Check if two cells are adjacent
function isAdjacent(cell1, cell2) {
  return Math.abs(cell1.x - cell2.x) <= 1 && Math.abs(cell1.y - cell2.y) <= 1;
}

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
    await redisClient.set(gameId,  JSON.stringify(game));

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
    const gameString = await redisClient.get(gameId);
    return gameString ? JSON.parse(gameString) : null;
  }

  /**
   * Add a player to a game
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated game
   */
  async addPlayerToGame(gameId, userId) {
    // Fetch the game from Redis
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');


    game.players.push({ userId, joinedAt: new Date().toISOString() });

    await redisClient.set(gameId, JSON.stringify(game));
   
    return game;
  }

    /**
   * Remove a player from a  game
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated game
   */
  async removePlayerFromGame(gameId, userId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');
  
    logger.info('Before removal:', game);
  
    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found in the game');
  
    // Remove exactly one player at the found index
    game.players.splice(playerIndex, 1);
  
    logger.info('After removal:', game);
  
    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }
  


  /**
   * Start a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game
   */
  // Helper: Fisher-Yates shuffle


  async startGame(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');
  
    // Update game status and start time
    game.status = 'active';
    game.startedAt = new Date().toISOString();
  
    const boardSize = game.boardSize; // e.g., 20
  
    // Flatten the board (it's a 2D array) into a single array of cells
    const flatBoard = game.board.flat();
  
    // Filter out cells on the edge: valid positions have x and y strictly between 0 and boardSize-1
    let validCells = flatBoard.filter(cell => {
      return cell.x > 0 && cell.x < boardSize - 1 && cell.y > 0 && cell.y < boardSize - 1;
    });
  
    // Shuffle valid cells to randomize assignment
    validCells = shuffleArray(validCells);
  
    // Array to hold cells where players are assigned (to check for adjacency)
    const assignedCells = [];
  
    // For each player, assign a cell that is not adjacent to any already assigned cell
    game.players.forEach(player => {
      const posIndex = validCells.findIndex(cell => {
        // Candidate cell is valid if it's not adjacent to any already assigned cell.
        return assignedCells.every(assigned => !isAdjacent(assigned, cell));
      });
  
      if (posIndex !== -1) {
        const chosenCell = validCells.splice(posIndex, 1)[0];
        // Assign the player's position
        player.position = { x: chosenCell.x, y: chosenCell.y };
        // Mark this cell as occupied by a player
        chosenCell.type = "player";
        // Save the chosen cell for future adjacency checks
        assignedCells.push(chosenCell);
      } else {
        console.warn("No valid position found for player", player);
      }
    });

    for(let i = 0;i<assignedCells.length;i++){
      console.log(assignedCells[i])
    }
  
    // Update the original board (2D array) with the assigned positions.
    // For each row, update cells that match an assigned cell.
    game.board = game.board.map(row => 
      row.map(cell => {
        const assigned = assignedCells.find(a => a.x === cell.x && a.y === cell.y);
        return assigned ? assigned : cell;
      })
    );
  
    // Save the updated game state to Redis as a JSON string
    await redisClient.set(gameId, JSON.stringify(game));
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