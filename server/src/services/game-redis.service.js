import redisClient from '../config/redis.js';
import logObj from '../utils/logger.js';

const { logger } = logObj;

// Helper: Fisher-Yates shuffle
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
    const gameId = `game:${Date.now()}`; // Unique game ID
    const game = {
      ...gameData,
      createdBy: userId,
      status: 'waiting',
      players: [],
      actionHistory: [],
      chatHistory: [],
      createdAt: new Date().toISOString(),
    };

    // Store game in Redis as JSON string
    await redisClient.set(gameId, JSON.stringify(game));

    // Add game ID to a Redis set for all games
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
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    game.players.push({ userId, joinedAt: new Date().toISOString() });

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Remove a player from a game
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

    game.players.splice(playerIndex, 1);

    logger.info('After removal:', game);

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Start a game: set status as active, distribute players on the board.
   * Each player's cell is updated with a JSON object representing their attributes.
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game state
   */
  async startGame(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    // Update game status and start time
    game.status = 'active';
    game.startedAt = new Date().toISOString();

    const boardSize = game.boardSize; // e.g., 20

    // Flatten the board (assume it's a 2D array)
    const flatBoard = game.board.flat();

    // Filter valid cells: cells not on the edge
    let validCells = flatBoard.filter(cell => {
      return cell.x > 0 && cell.x < boardSize - 1 && cell.y > 0 && cell.y < boardSize - 1;
    });

    // Shuffle valid cells for random assignment
    validCells = shuffleArray(validCells);

    // Array to store cells where players are assigned (for adjacency checking)
    const assignedCells = [];

    // For each player, assign a valid cell that is not adjacent to already assigned cells
    game.players.forEach(player => {
      const posIndex = validCells.findIndex(cell => {
        return assignedCells.every(assigned => !isAdjacent(assigned, cell));
      });

      if (posIndex !== -1) {
        const chosenCell = validCells.splice(posIndex, 1)[0];
        // Assign the player's position
        player.position = { x: chosenCell.x, y: chosenCell.y };

        // Create player attributes as an object, per Tank Turn Tactics rules
        const playerData = {
          role: "player",    // Mark cell as occupied by a player
          userId: player.userId,
          ap: 300,           // Starting Action Points
          range: 1,          // Starting range (can be upgraded)
          heart: 3,          // Health: 3 hearts
          // Additional properties can be added as needed
        };

        // Update the chosen cell with player data
        chosenCell.type = playerData;
        assignedCells.push(chosenCell);
      } else {
        console.warn("No valid position found for player", player);
      }
    });

    // For debugging: print all assigned cells
    assignedCells.forEach(cell => console.log(`Assigned cell: x=${cell.x}, y=${cell.y}`, cell.type));

    // Update the original board (2D array) with assigned cells
    game.board = game.board.map(row =>
      row.map(cell => {
        const assigned = assignedCells.find(a => a.x === cell.x && a.y === cell.y);
        return assigned ? assigned : cell;
      })
    );

    // Save updated game state
    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Increase AP of each player by 1.
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game state
   */
  async distributeActionPoints(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");

    // Update players in the players list
    game.players = game.players.map(player => ({
      ...player,
      ap: (player.ap || 0) + 1
    }));

    // Optionally update the AP in the board as well
    for (let row of game.board) {
      for (let cell of row) {
        if (typeof cell.type === "object" && cell.type.role === "player") {
          cell.type.ap = (cell.type.ap || 0) + 1;
        }
      }
    }

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Start AP distribution every 1 minute.
   * @param {string} gameId - Game ID
   * @returns {number} - Interval ID
   */
  startAPDistribution(gameId) {
    const intervalId = setInterval(async () => {
      try {
        const updatedGame = await this.distributeActionPoints(gameId);
        console.log(`Distributed AP for game ${gameId}`, updatedGame);
      } catch (error) {
        console.error("Error distributing AP:", error);
      }
    }, 60000); // Every 60,000 ms (1 minute)
    return intervalId;
  }

  /**
 * Move a player on the board.
 * Validates that the move is within bounds, within the player's range (diagonals allowed),
 * the target cell is empty, and that the player has enough AP.
 * @param {string} gameId - Game ID
 * @param {string} userId - User ID of the moving player
 * @param {number} newX - Target X coordinate
 * @param {number} newY - Target Y coordinate
 * @returns {Promise<Object>} - Updated game state
 */
async movePlayer(gameId, userId, newX, newY) {
  const game = await this.getGameById(gameId);
  if (!game) throw new Error("Game not found");

  const boardSize = game.boardSize;
  // Validate target coordinates
  if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) {
    throw new Error("Target cell is out of board boundaries");
  }
  // Ensure board is a 2D array
  if (!Array.isArray(game.board) || !Array.isArray(game.board[0])) {
    throw new Error("Board data is not in the expected 2D array format");
  }
  // Get target cell from the board
  const targetCell = game.board[newY][newX];
  if (!targetCell || targetCell.type !== "empty") {
    throw new Error("Target cell is not empty");
  }
  // Find the player's current cell by scanning the board
  let currentCell = null;
  for (const row of game.board) {
    for (const cell of row) {
      if (typeof cell.type === "object" && cell.type.role === "player" && cell.type.userId === userId) {
        currentCell = cell;
        break;
      }
    }
    if (currentCell) break;
  }
  if (!currentCell) {
    throw new Error("Player's current position not found on board");
  }
  // Use Chebyshev distance to allow diagonal moves
  const dx = Math.abs(newX - currentCell.x);
  const dy = Math.abs(newY - currentCell.y);
  const distance = Math.max(dx, dy);
  if (distance === 0 || distance > currentCell.type.range) {
    throw new Error("Move must be within your allowed range");
  }
  // Check if the player has enough AP (cost is 1)
  if (currentCell.type.ap < 1) {
    throw new Error("Not enough Action Points to move");
  }
  // Deduct 1 AP from the player's data
  const playerData = { ...currentCell.type, ap: currentCell.type.ap - 1 };
  // Mark current cell as empty
  currentCell.type = "empty";
  // Update target cell with player's data (i.e., move the player)
  targetCell.type = playerData;
  // Optionally update the player's record in game.players
  const playerInList = game.players.find(p => p.userId === userId);
  if (playerInList) {
    playerInList.position = { x: newX, y: newY };
  }
  await redisClient.set(gameId, JSON.stringify(game));
  return game;
}

/**
 * Shoot a player.
 * Validates that:
 *  - The target cell is within board boundaries.
 *  - The target cell contains a player.
 *  - The target is within the shooter's range (diagonals allowed).
 *  - The shooter has at least 3 AP.
 * On a successful shot, reduces the target's health by 1.
 * If health reaches 0, marks the target as dead.
 * @param {string} gameId - Game ID
 * @param {string} shooterId - User ID of the shooter
 * @param {number} targetX - Target cell X coordinate
 * @param {number} targetY - Target cell Y coordinate
 * @returns {Promise<Object>} - Updated game state
 */
async shootPlayer(gameId, shooterId, targetX, targetY) {
  const game = await this.getGameById(gameId);
  if (!game) throw new Error("Game not found");

  const boardSize = game.boardSize;
  // Validate target coordinates
  if (targetX < 0 || targetX >= boardSize || targetY < 0 || targetY >= boardSize) {
    throw new Error("Target cell is out of board boundaries");
  }
  // Ensure board is a 2D array
  if (!Array.isArray(game.board) || !Array.isArray(game.board[0])) {
    throw new Error("Board data is not in the expected 2D array format");
  }
  // Get target cell from the board
  const targetCell = game.board[targetY][targetX];
  if (!targetCell || typeof targetCell.type !== "object" || targetCell.type.role !== "player") {
    throw new Error("No target player found at the specified cell");
  }
  // Find the shooter's current cell by scanning the board
  let shooterCell = null;
  for (const row of game.board) {
    for (const cell of row) {
      if (typeof cell.type === "object" && cell.type.role === "player" && cell.type.userId === shooterId) {
        shooterCell = cell;
        break;
      }
    }
    if (shooterCell) break;
  }
  if (!shooterCell) {
    throw new Error("Shooter's current position not found on board");
  }
  // Check that the target is within shooter's range (using Chebyshev distance)
  const dx = Math.abs(targetX - shooterCell.x);
  const dy = Math.abs(targetY - shooterCell.y);
  const distance = Math.max(dx, dy);
  if (distance === 0 || distance > shooterCell.type.range) {
    throw new Error("Target must be within your allowed range");
  }
  // Check if the shooter has enough AP (3 AP required)
  if (shooterCell.type.ap < 3) {
    throw new Error("Not enough Action Points to shoot");
  }
  // Deduct 3 AP from the shooter
  const shooterData = { ...shooterCell.type, ap: shooterCell.type.ap - 3 };
  shooterCell.type = shooterData;
  // Process the target: reduce health by 1
  const targetData = { ...targetCell.type };
  if (targetData.heart <= 0) {
    throw new Error("Target is already dead");
  }
  targetData.heart = targetData.heart - 1;
  // If target's health reaches 0, mark as dead
  if (targetData.heart === 0) {
    targetData.status = "dead";
  }
  targetCell.type = targetData;
  // Optionally, update the target in game.players as well
  const targetPlayer = game.players.find(p => p.userId === targetData.userId);
  if (targetPlayer) {
    targetPlayer.health = targetData.heart;
    if (targetData.heart === 0) {
      targetPlayer.status = "dead";
    }
  }
  await redisClient.set(gameId, JSON.stringify(game));
  return game;
}

/**
 * Transfer Action Points from one player to another.
 * Validates that the donor has enough AP and that the target is within the donor's range.
 * Deducts the specified amount from the donor and adds it to the target.
 * @param {string} gameId - Game ID
 * @param {string} donorId - User ID of the donor
 * @param {Object} transferData - Contains targetX, targetY, and amount
 * @returns {Promise<Object>} - Updated game state
 */
async transferActionPoints(gameId, donorId, targetX, targetY, amount =1) {
  const game = await this.getGameById(gameId);
  if (!game) throw new Error("Game not found");

  // Find the donor's cell by scanning the board
  let donorCell = null;
  for (const row of game.board) {
    for (const cell of row) {
      if (typeof cell.type === "object" && cell.type.role === "player" && cell.type.userId === donorId) {
        donorCell = cell;
        break;
      }
    }
    if (donorCell) break;
  }
  if (!donorCell) throw new Error("Donor's cell not found on board");

  // Validate target coordinates against board dimensions
  if (
    targetY < 0 ||
    targetY >= game.board.length ||
    targetX < 0 ||
    targetX >= game.board[0].length
  ) {
    throw new Error("Target coordinates are out of board boundaries");
  }

  // Find the target cell using the provided coordinates
  const targetCell = game.board[targetY][targetX];
  if (!targetCell || typeof targetCell.type !== "object" || targetCell.type.role !== "player") {
    throw new Error("No target player found at the specified coordinates");
  }

  // Check if target is within donor's transfer range using Chebyshev distance
  const dx = Math.abs(donorCell.x - targetX);
  const dy = Math.abs(donorCell.y - targetY);
  const distance = Math.max(dx, dy);
  if (distance > donorCell.type.range) {
    throw new Error("Target is out of transfer range");
  }

  // Validate that the donor has enough AP to transfer the specified amount
  if (donorCell.type.ap < amount) {
    throw new Error("Donor does not have enough Action Points");
  }

  // Transfer AP: Deduct the specified amount from donor and add it to target
  donorCell.type.ap -= amount;
  targetCell.type.ap = (targetCell.type.ap || 0) + amount;

  // Optionally update the game.players entries as well
  const donorPlayer = game.players.find(p => p.userId === donorId);
  const targetPlayer = game.players.find(p => p.userId === targetCell.type.userId);
  if (donorPlayer) donorPlayer.ap = donorCell.type.ap;
  if (targetPlayer) targetPlayer.ap = targetCell.type.ap;

  // Save the updated game state to Redis
  await redisClient.set(gameId, JSON.stringify(game));
  return game;
}


  /**
   * Increase the range of a player's shooting.
   * Requires that the player has at least 3 AP.
   * Deducts 3 AP and increases range by 1.
   * @param {string} gameId - Game ID
   * @param {string} userId - User ID of the player
   * @returns {Promise<Object>} - Updated game state
   */
  async increaseRange(gameId, userId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");

    // Find the player's current cell by scanning the board
    let currentCell = null;
    for (const row of game.board) {
      for (const cell of row) {
        if (typeof cell.type === "object" && cell.type.role === "player" && cell.type.userId === userId) {
          currentCell = cell;
          break;
        }
      }
      if (currentCell) break;
    }
    if (!currentCell) {
      throw new Error("Player's current position not found on board");
    }
    
    // Check if the player has enough AP (3 AP required for increasing range)
    if (currentCell.type.ap < 3) {
      throw new Error("Not enough Action Points to increase range");
    }
    
    // Deduct 3 AP and increase range by 1
    currentCell.type.ap -= 3;
    currentCell.type.range = (currentCell.type.range || 1) + 1;

    // Optionally update game.players entry as well
    const playerInList = game.players.find(p => p.userId === userId);
    if (playerInList) {
      playerInList.range = currentCell.type.range;
      playerInList.ap = currentCell.type.ap;
    }

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Add an action to the game history
   * @param {string} gameId - Game ID
   * @param {Object} action - Action data
   * @returns {Promise<Object>} - Updated game state
   */
  async addGameAction(gameId, action) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");

    game.actionHistory.push(action);

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Add a chat message to the game
   * @param {string} gameId - Game ID
   * @param {Object} message - Message data
   * @returns {Promise<Object>} - Updated game state
   */
  async addChatMessage(gameId, message) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");

    game.chatHistory.push(message);

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * End a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Updated game state
   */
  async endGame(gameId) {
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");

    game.status = "completed";
    game.endedAt = new Date().toISOString();

    await redisClient.set(gameId, JSON.stringify(game));
    return game;
  }

  /**
   * Get all games
   * @returns {Promise<Array>} - Array of all games
   */
  async getAllGames() {
    const gameIds = await redisClient.smembers("games");
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
