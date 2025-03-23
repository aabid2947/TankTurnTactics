// import gameRepository from '../repositories/game.repository.js';
// import userRepository from '../repositories/user.repository.js';
// import logger from '../utils/logger.js';

// /**
//  * Game service
//  */
// class GameService {
//   /**
//    * Create a new game
//    * @param {Object} gameData - Game data
//    * @param {string} userId - User ID of the creator
//    * @returns {Promise<Object>} - Created game
//    */
//   async createGame(gameData, userId) {
//     try {
//       // Validate required fields
//       if (!gameData.name) {
//         throw new Error('Game name is required');
//       }
      
//       // Create game with user as creator
//       const game = await gameRepository.createGame({
//         ...gameData,
//         createdBy: userId
//       });
      
//       logger.info(`Game created: ${game.id}`, { gameId: game.id, userId });
      
//       return game;
//     } catch (error) {
//       logger.error(`Error creating game: ${error.message}`, { gameData, userId });
//       throw error;
//     }
//   }
  
//   /**
//    * Get a game by ID
//    * @param {string} gameId - Game ID
//    * @returns {Promise<Object>} - Game data
//    */
//   async getGameById(gameId) {
//     try {
//       const game = await gameRepository.getGameById(gameId);
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       return game;
//     } catch (error) {
//       logger.error(`Error getting game: ${error.message}`, { gameId });
//       throw error;
//     }
//   }
  
//   /**
//    * Get games by status
//    * @param {string} status - Game status
//    * @param {number} limit - Maximum number of games to return
//    * @param {number} page - Page number
//    * @returns {Promise<Object>} - Games and pagination info
//    */
//   async getGamesByStatus(status, limit = 10, page = 1) {
//     try {
//       return gameRepository.getGamesByStatus(status, limit, page);
//     } catch (error) {
//       logger.error(`Error getting games by status: ${error.message}`, { status, limit, page });
//       throw error;
//     }
//   }
  
//   /**
//    * Join a game
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @returns {Promise<Object>} - Updated game
//    */
//   async joinGame(gameId, userId) {
//     try {
//       // Get user data
//       const user = await userRepository.getUserById(userId);
      
//       if (!user) {
//         throw new Error('User not found');
//       }
      
//       // Add player to game
//       const game = await gameRepository.addPlayerToGame(gameId, { user: userId });
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       logger.info(`User ${userId} joined game ${gameId}`);
      
//       return game;
//     } catch (error) {
//       logger.error(`Error joining game: ${error.message}`, { gameId, userId });
//       throw error;
//     }
//   }
  
//   /**
//    * Start a game
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @returns {Promise<Object>} - Updated game
//    */
//   async startGame(gameId, userId) {
//     try {
//       const game = await gameRepository.startGame(gameId, userId);
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       logger.info(`Game ${gameId} started by ${userId}`);
      
//       return game;
//     } catch (error) {
//       logger.error(`Error starting game: ${error.message}`, { gameId, userId });
//       throw error;
//     }
//   }
  
//   /**
//    * Get a player's games
//    * @param {string} userId - User ID
//    * @returns {Promise<Object[]>} - Array of games
//    */
//   async getPlayerGames(userId) {
//     try {
//       return gameRepository.getPlayerGames(userId);
//     } catch (error) {
//       logger.error(`Error getting player games: ${error.message}`, { userId });
//       throw error;
//     }
//   }
  
//   /**
//    * Process a player action
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @param {Object} action - Action data
//    * @returns {Promise<Object>} - Updated game
//    */
//   async processAction(gameId, userId, action) {
//     try {
//       // Get game
//       const game = await gameRepository.getGameById(gameId);
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       // Check if game is active
//       if (game.status !== 'active') {
//         throw new Error('Game is not active');
//       }
      
//       // Find player
//       const player = game.players.find(p => p.user === userId);
      
//       if (!player) {
//         throw new Error('Player not in game');
//       }
      
//       // Check if player is alive
//       if (!player.isAlive) {
//         throw new Error('Player is not alive');
//       }
      
//       // Process action based on type
//       switch (action.type) {
//         case 'move':
//           return this.processMove(gameId, userId, player, action, game);
        
//         case 'shoot':
//           return this.processShoot(gameId, userId, player, action, game);
        
//         case 'upgrade':
//           return this.processUpgrade(gameId, userId, player, action, game);
        
//         default:
//           throw new Error('Invalid action type');
//       }
//     } catch (error) {
//       logger.error(`Error processing action: ${error.message}`, { gameId, userId, action });
//       throw error;
//     }
//   }
  
//   /**
//    * Process a move action
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @param {Object} player - Player data
//    * @param {Object} action - Action data
//    * @param {Object} game - Game data
//    * @returns {Promise<Object>} - Updated game
//    */
//   async processMove(gameId, userId, player, action, game) {
//     // Check if player has enough action points
//     if (player.actionPoints < game.settings.apCostMove) {
//       throw new Error('Not enough action points');
//     }
    
//     // Validate target position
//     const { x, y } = action.position;
    
//     // Check if position is within board boundaries
//     if (
//       x < 0 || 
//       y < 0 || 
//       x >= game.currentBoardSize.width || 
//       y >= game.currentBoardSize.height
//     ) {
//       throw new Error('Position is outside the board');
//     }
    
//     // Check if position is already occupied
//     if (game.players.some(p => 
//       p.isAlive && 
//       p.user !== userId && 
//       p.position.x === x && 
//       p.position.y === y
//     )) {
//       throw new Error('Position is already occupied');
//     }
    
//     // Check if move is valid (adjacent to current position)
//     const dx = Math.abs(x - player.position.x);
//     const dy = Math.abs(y - player.position.y);
    
//     if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
//       throw new Error('Invalid move');
//     }
    
//     // Update player position and action points
//     const updatedPlayer = {
//       ...player,
//       position: { x, y },
//       actionPoints: player.actionPoints - game.settings.apCostMove
//     };
    
//     // Add action to history
//     const actionData = {
//       actionType: 'move',
//       player: userId,
//       details: {
//         from: { ...player.position },
//         to: { x, y }
//       }
//     };
    
//     // Update player
//     await gameRepository.updatePlayer(gameId, userId, updatedPlayer);
    
//     // Add action to history
//     await gameRepository.addGameAction(gameId, actionData);
    
//     // Get updated game
//     return gameRepository.getGameById(gameId);
//   }
  
//   /**
//    * Process a shoot action
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @param {Object} player - Player data
//    * @param {Object} action - Action data
//    * @param {Object} game - Game data
//    * @returns {Promise<Object>} - Updated game
//    */
//   async processShoot(gameId, userId, player, action, game) {
//     // Check if player has enough action points
//     if (player.actionPoints < game.settings.apCostShoot) {
//       throw new Error('Not enough action points');
//     }
    
//     // Validate target position
//     const { x, y } = action.position;
    
//     // Check if position is within board boundaries
//     if (
//       x < 0 || 
//       y < 0 || 
//       x >= game.currentBoardSize.width || 
//       y >= game.currentBoardSize.height
//     ) {
//       throw new Error('Position is outside the board');
//     }
    
//     // Check if target is within range
//     const dx = Math.abs(x - player.position.x);
//     const dy = Math.abs(y - player.position.y);
//     const distance = Math.max(dx, dy);
    
//     if (distance > player.range) {
//       throw new Error('Target is out of range');
//     }
    
//     // Find target player
//     const targetPlayerIndex = game.players.findIndex(p => 
//       p.isAlive && 
//       p.position.x === x && 
//       p.position.y === y
//     );
    
//     if (targetPlayerIndex === -1) {
//       throw new Error('No player at target position');
//     }
    
//     const targetPlayer = game.players[targetPlayerIndex];
    
//     // Update shooter's action points
//     const updatedShooter = {
//       ...player,
//       actionPoints: player.actionPoints - game.settings.apCostShoot
//     };
    
//     // Update target player's health
//     const newHealth = Math.max(0, targetPlayer.health - game.settings.damagePerShot);
//     const isTargetKilled = newHealth === 0;
    
//     const updatedTarget = {
//       ...targetPlayer,
//       health: newHealth,
//       isAlive: !isTargetKilled,
//       deaths: isTargetKilled ? targetPlayer.deaths + 1 : targetPlayer.deaths
//     };
    
//     // If target is killed, update shooter's kills
//     if (isTargetKilled) {
//       updatedShooter.kills = player.kills + 1;
      
//       // Update user stats
//       await userRepository.updateUserStats(userId, {
//         kills: player.kills + 1
//       });
      
//       await userRepository.updateUserStats(targetPlayer.user, {
//         deaths: targetPlayer.deaths + 1
//       });
//     }
    
//     // Add action to history
//     const actionData = {
//       actionType: 'shoot',
//       player: userId,
//       details: {
//         target: targetPlayer.user,
//         damage: game.settings.damagePerShot,
//         targetKilled: isTargetKilled,
//         position: { x, y }
//       }
//     };
    
//     // Update players
//     await gameRepository.updatePlayer(gameId, userId, updatedShooter);
//     await gameRepository.updatePlayer(gameId, targetPlayer.user, updatedTarget);
    
//     // Add action to history
//     await gameRepository.addGameAction(gameId, actionData);
    
//     // Check if game is over
//     const gameStatus = await gameRepository.checkGameOver(gameId);
    
//     if (gameStatus.isOver && gameStatus.winner) {
//       // Update winner's stats
//       await userRepository.updateUserStats(gameStatus.winner, {
//         gamesWon: 1
//       });
      
//       // Update all players' stats
//       for (const player of game.players) {
//         await userRepository.updateUserStats(player.user, {
//           gamesPlayed: 1
//         });
//       }
//     }
    
//     // Get updated game
//     return gameRepository.getGameById(gameId);
//   }
  
//   /**
//    * Process an upgrade action
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @param {Object} player - Player data
//    * @param {Object} action - Action data
//    * @param {Object} game - Game data
//    * @returns {Promise<Object>} - Updated game
//    */
//   async processUpgrade(gameId, userId, player, action, game) {
//     // Check if player has enough action points
//     if (player.actionPoints < game.settings.apCostUpgrade) {
//       throw new Error('Not enough action points');
//     }
    
//     // Update player's range and action points
//     const updatedPlayer = {
//       ...player,
//       range: player.range + 1,
//       actionPoints: player.actionPoints - game.settings.apCostUpgrade
//     };
    
//     // Add action to history
//     const actionData = {
//       actionType: 'upgrade',
//       player: userId,
//       details: {
//         newRange: updatedPlayer.range
//       }
//     };
    
//     // Update player
//     await gameRepository.updatePlayer(gameId, userId, updatedPlayer);
    
//     // Add action to history
//     await gameRepository.addGameAction(gameId, actionData);
    
//     // Get updated game
//     return gameRepository.getGameById(gameId);
//   }
  
//   /**
//    * Add a chat message to a game
//    * @param {string} gameId - Game ID
//    * @param {string} userId - User ID
//    * @param {string} message - Message content
//    * @returns {Promise<Object>} - Updated game
//    */
//   async addChatMessage(gameId, userId, message) {
//     try {
//       // Get game
//       const game = await gameRepository.getGameById(gameId);
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       // Check if user is in the game
//       const isPlayerInGame = game.players.some(p => p.user === userId) || game.createdBy === userId;
      
//       if (!isPlayerInGame) {
//         throw new Error('User is not in the game');
//       }
      
//       // Create message object
//       const messageData = {
//         user: userId,
//         content: message,
//         timestamp: Date.now()
//       };
      
//       // Add message to game
//       await gameRepository.addChatMessage(gameId, messageData);
      
//       logger.info(`Chat message added to game ${gameId} by ${userId}`);
      
//       // Get updated game
//       return gameRepository.getGameById(gameId);
//     } catch (error) {
//       logger.error(`Error adding chat message: ${error.message}`, { gameId, userId });
//       throw error;
//     }
//   }
  
//   /**
//    * Get game history
//    * @param {string} gameId - Game ID
//    * @param {number} limit - Maximum number of actions to return
//    * @param {number} page - Page number
//    * @returns {Promise<Object>} - Game history
//    */
//   async getGameHistory(gameId, limit = 20, page = 1) {
//     try {
//       // Check if game exists
//       const game = await gameRepository.getGameById(gameId);
      
//       if (!game) {
//         throw new Error('Game not found');
//       }
      
//       return gameRepository.getGameHistory(gameId, limit, page);
//     } catch (error) {
//       logger.error(`Error getting game history: ${error.message}`, { gameId });
//       throw error;
//     }
//   }
  
//   /**
//    * Distribute action points to all players in a game
//    * @param {string} gameId - Game ID
//    * @returns {Promise<Object>} - Updated game
//    */
//   async distributeActionPoints(gameId) {
//     try {
//       const game = await gameRepository.distributeActionPoints(gameId);
      
//       if (!game) {
//         throw new Error('Game not found or not active');
//       }
      
//       logger.info(`Action points distributed for game ${gameId}`);
      
//       return game;
//     } catch (error) {
//       logger.error(`Error distributing action points: ${error.message}`, { gameId });
//       throw error;
//     }
//   }
  
//   /**
//    * Shrink the game board
//    * @param {string} gameId - Game ID
//    * @returns {Promise<Object>} - Updated game
//    */
//   async shrinkBoard(gameId) {
//     try {
//       const game = await gameRepository.shrinkBoard(gameId);
      
//       if (!game) {
//         throw new Error('Game not found or not active');
//       }
      
//       logger.info(`Board shrunk for game ${gameId} to ${game.currentBoardSize.width}x${game.currentBoardSize.height}`);
      
//       return game;
//     } catch (error) {
//       logger.error(`Error shrinking board: ${error.message}`, { gameId });
//       throw error;
//     }
//   }
// }

// // Create a singleton instance
// const gameService = new GameService();

// export default gameService; 