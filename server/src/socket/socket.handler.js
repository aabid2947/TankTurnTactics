import jwt from 'jsonwebtoken';
import gameService from '../services/game.service.js';
import userRepository from '../repositories/user.repository.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Socket.io handler
 */
class SocketHandler {
  constructor(io) {
    this.io = io;
    this.gameNamespaces = new Map();
    this.userSockets = new Map();
    
    // Set up authentication middleware
    this.io.use(this.authenticateSocket.bind(this));
    
    // Set up connection handler
    this.io.on('connection', this.handleConnection.bind(this));
    
    logger.info('Socket.io handler initialized');
  }
  
  /**
   * Authenticate socket connection
   * @param {Object} socket - Socket.io socket
   * @param {Function} next - Next function
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if user exists
      const user = await userRepository.getUserById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user.id,
        username: user.username
      };
      
      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication error'));
    }
  }
  
  /**
   * Handle socket connection
   * @param {Object} socket - Socket.io socket
   */
  handleConnection(socket) {
    const { id: userId, username } = socket.user;
    
    logger.info(`User connected: ${username} (${userId})`);
    
    // Store socket for user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    
    // Set up event handlers
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('join-game', (gameId) => this.handleJoinGame(socket, gameId));
    socket.on('leave-game', (gameId) => this.handleLeaveGame(socket, gameId));
    socket.on('game-action', (data) => this.handleGameAction(socket, data));
    socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
    
    // Send user info
    socket.emit('user-info', { id: userId, username });
  }
  
  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket.io socket
   */
  handleDisconnect(socket) {
    const { id: userId, username } = socket.user;
    
    logger.info(`User disconnected: ${username} (${userId})`);
    
    // Remove socket from user sockets
    if (this.userSockets.has(userId)) {
      const userSockets = this.userSockets.get(userId);
      userSockets.delete(socket.id);
      
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    // Leave all game rooms
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        this.handleLeaveGame(socket, room);
      }
    });
  }
  
  /**
   * Handle join game event
   * @param {Object} socket - Socket.io socket
   * @param {string} gameId - Game ID
   */
  async handleJoinGame(socket, gameId) {
    try {
      const { id: userId, username } = socket.user;
      
      // Get game
      const game = await gameService.getGameById(gameId);
      
      // Join socket room for game
      socket.join(gameId);
      
      logger.info(`User ${username} (${userId}) joined game room ${gameId}`);
      
      // Send game state to user
      socket.emit('game-state', game);
      
      // Notify other users in the room
      socket.to(gameId).emit('user-joined', {
        userId,
        username,
        gameId
      });
    } catch (error) {
      logger.error(`Error joining game: ${error.message}`, {
        userId: socket.user.id,
        gameId
      });
      
      socket.emit('error', {
        message: `Error joining game: ${error.message}`
      });
    }
  }
  
  /**
   * Handle leave game event
   * @param {Object} socket - Socket.io socket
   * @param {string} gameId - Game ID
   */
  async handleLeaveGame(socket, gameId) {
    try {
      const { id: userId, username } = socket.user;
      
      // Leave socket room for game
      socket.leave(gameId);
      
      logger.info(`User ${username} (${userId}) left game room ${gameId}`);
      
      // Notify other users in the room
      socket.to(gameId).emit('user-left', {
        userId,
        username,
        gameId
      });
    } catch (error) {
      logger.error(`Error leaving game: ${error.message}`, {
        userId: socket.user.id,
        gameId
      });
    }
  }
  
  /**
   * Handle game action event
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Action data
   */
  async handleGameAction(socket, data) {
    try {
      const { id: userId, username } = socket.user;
      const { gameId, action } = data;
      
      if (!gameId || !action || !action.type) {
        throw new Error('Invalid action data');
      }
      
      // Process action
      const game = await gameService.processAction(gameId, userId, action);
      
      // Broadcast updated game state to all users in the room
      this.io.to(gameId).emit('game-state', game);
      
      // Broadcast action to all users in the room
      this.io.to(gameId).emit('game-action', {
        userId,
        username,
        gameId,
        action
      });
      
      logger.info(`User ${username} (${userId}) performed action in game ${gameId}`, {
        actionType: action.type
      });
    } catch (error) {
      logger.error(`Error processing game action: ${error.message}`, {
        userId: socket.user.id,
        data
      });
      
      socket.emit('error', {
        message: `Error processing action: ${error.message}`
      });
    }
  }
  
  /**
   * Handle chat message event
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Message data
   */
  async handleChatMessage(socket, data) {
    try {
      const { id: userId, username } = socket.user;
      const { gameId, message } = data;
      
      if (!gameId || !message) {
        throw new Error('Invalid message data');
      }
      
      // Add message to game
      const game = await gameService.addChatMessage(gameId, userId, message);
      
      // Broadcast message to all users in the room
      this.io.to(gameId).emit('chat-message', {
        userId,
        username,
        gameId,
        message,
        timestamp: Date.now()
      });
      
      logger.info(`User ${username} (${userId}) sent message in game ${gameId}`);
    } catch (error) {
      logger.error(`Error sending chat message: ${error.message}`, {
        userId: socket.user.id,
        data
      });
      
      socket.emit('error', {
        message: `Error sending message: ${error.message}`
      });
    }
  }
  
  /**
   * Broadcast game state to all users in a game
   * @param {string} gameId - Game ID
   * @param {Object} game - Game data
   */
  broadcastGameState(gameId, game) {
    this.io.to(gameId).emit('game-state', game);
  }
  
  /**
   * Send notification to a specific user
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  sendNotification(userId, type, data) {
    if (this.userSockets.has(userId)) {
      const socketIds = this.userSockets.get(userId);
      
      socketIds.forEach((socketId) => {
        this.io.to(socketId).emit('notification', {
          type,
          data,
          timestamp: Date.now()
        });
      });
      
      logger.info(`Notification sent to user ${userId}`, { type });
    }
  }
  
  /**
   * Start game update interval
   * @param {string} gameId - Game ID
   * @param {number} interval - Interval in milliseconds
   */
  startGameUpdateInterval(gameId, interval = 1000) {
    // Create interval for game updates
    const intervalId = setInterval(async () => {
      try {
        // Get game
        const game = await gameService.getGameById(gameId);
        
        if (!game || game.status !== 'active') {
          clearInterval(intervalId);
          return;
        }
        
        // Check if it's time to distribute action points
        const now = Date.now();
        const lastActionTime = game.lastActionAt;
        const turnDuration = game.settings.turnDuration * 1000; // Convert to milliseconds
        
        if (now - lastActionTime >= turnDuration) {
          // Distribute action points
          const updatedGame = await gameService.distributeActionPoints(gameId);
          
          // Broadcast updated game state
          this.broadcastGameState(gameId, updatedGame);
          
          // Check if it's time to shrink the board
          const turnsSinceStart = Math.floor((now - game.startedAt) / turnDuration);
          
          if (turnsSinceStart > 0 && turnsSinceStart % game.settings.boardShrinkInterval === 0) {
            // Shrink the board
            const shrunkGame = await gameService.shrinkBoard(gameId);
            
            // Broadcast updated game state
            this.broadcastGameState(gameId, shrunkGame);
          }
        }
      } catch (error) {
        logger.error(`Error in game update interval: ${error.message}`, { gameId });
      }
    }, interval);
    
    // Store interval ID
    this.gameNamespaces.set(gameId, intervalId);
    
    logger.info(`Game update interval started for game ${gameId}`);
  }
  
  /**
   * Stop game update interval
   * @param {string} gameId - Game ID
   */
  stopGameUpdateInterval(gameId) {
    if (this.gameNamespaces.has(gameId)) {
      clearInterval(this.gameNamespaces.get(gameId));
      this.gameNamespaces.delete(gameId);
      
      logger.info(`Game update interval stopped for game ${gameId}`);
    }
  }
}

export default SocketHandler; 