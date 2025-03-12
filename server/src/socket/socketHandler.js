import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Game from '../models/game.model.js';
import gameRedisService from '../services/game-redis.service.js';
import authRedisService from '../services/auth-redis.service.js';
import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

/**
 * Setup Socket.io handlers with Upstash Redis Cloud for real-time communication
 * @param {Object} io - Socket.io instance
 */
const setupSocketHandlers = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const result = await authRedisService.verifyToken(token);
      if (!result) {
        return next(new Error('Authentication error'));
      }
      
      // Attach user to socket
      socket.user = result.user;
      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`, { userId: socket.user.id });
    
    // Update user status to online
    User.findByIdAndUpdate(socket.user.id, { isOnline: true, lastActive: Date.now() })
      .catch(err => console.error('Error updating user status:', err));
    
    // Join user to their own room for private messages
    socket.join(`user:${socket.user.id}`);
    
    // Join a game room
    socket.on('joinGame', async (gameId) => {
      try {
        const game = await gameRedisService.getGameById(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        // Check if user is a player in the game
        const isPlayerInGame = game.players.some(player => player.userId === socket.user.id);
        if (!isPlayerInGame) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Join the game room
        socket.join(gameId);
        
        // Notify other players
        socket.to(gameId).emit('playerJoined', {
          userId: socket.user.id,
          username: socket.user.username
        });
        
        logger.info(`Player joined game room: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Join game room error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });
    
    // Leave a game room
    socket.on('leaveGame', (gameId) => {
      socket.leave(gameId);
      
      // Notify other players
      socket.to(gameId).emit('playerLeft', {
        userId: socket.user.id,
        username: socket.user.username
      });
      
      logger.info(`Player left game room: ${gameId}`, { userId: socket.user.id, gameId });
    });
    
    // Send a chat message
    socket.on('gameChatMessage', async (data) => {
      try {
        const { gameId, message } = data;
        
        const game = await gameRedisService.getGameById(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        // Check if user is a player in the game
        const isPlayerInGame = game.players.some(player => player.userId === socket.user.id);
        if (!isPlayerInGame) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Add chat message
        const chatMessage = {
          userId: socket.user.id,
          username: socket.user.username,
          message,
          timestamp: new Date().toISOString()
        };
        
        await gameRedisService.addChatMessage(gameId, chatMessage);
        
        // Broadcast to all players in the game
        io.to(gameId).emit('gameChatMessage', chatMessage);
        
        // Also publish to Redis channel for persistence and potential external subscribers
        await redisClient.publish(`game:${gameId}:chat`, JSON.stringify(chatMessage));
        
        logger.info(`Chat message sent in game: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Game chat message error: ${error.message}`, { userId: socket.user.id, gameId: data.gameId });
        socket.emit('error', { message: 'Failed to send chat message' });
      }
    });
    
    // Perform a game action
    socket.on('gameAction', async (data) => {
      try {
        const { gameId, action } = data;
        
        const game = await gameRedisService.getGameById(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        // Check if user is a player in the game
        const isPlayerInGame = game.players.some(player => player.userId === socket.user.id);
        if (!isPlayerInGame) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Check if game is active
        if (game.status !== 'active') {
          socket.emit('error', { message: 'Game is not active' });
          return;
        }
        
        // Process the action based on type
        let result;
        switch (action.type) {
          case 'move':
            // Process move action
            // Implementation depends on game rules
            break;
          case 'shoot':
            // Process shoot action
            // Implementation depends on game rules
            break;
          case 'upgrade':
            // Process upgrade action
            // Implementation depends on game rules
            break;
          case 'trade':
            // Process trade action
            // Implementation depends on game rules
            break;
          default:
            socket.emit('error', { message: 'Invalid action type' });
            return;
        }
        
        // Add action to game history
        const gameAction = {
          userId: socket.user.id,
          username: socket.user.username,
          action,
          timestamp: new Date().toISOString()
        };
        
        await gameRedisService.addGameAction(gameId, gameAction);
        
        // Broadcast action to all players in the game
        io.to(gameId).emit('gameAction', gameAction);
        
        // Also publish to Redis channel for persistence and potential external subscribers
        await redisClient.publish(`game:${gameId}:actions`, JSON.stringify(gameAction));
        
        logger.info(`Game action performed: ${action.type} in game ${gameId}`, { 
          userId: socket.user.id, 
          gameId, 
          actionType: action.type 
        });
      } catch (error) {
        logger.error(`Game action error: ${error.message}`, { 
          userId: socket.user.id, 
          gameId: data.gameId, 
          actionType: data.action.type 
        });
        socket.emit('error', { message: 'Failed to perform action' });
      }
    });
    
    // Subscribe to game updates
    socket.on('subscribeToGame', async (gameId) => {
      try {
        const game = await gameRedisService.getGameById(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        // Subscribe to Redis channel for game updates
        const subscriber = await redisClient.subscribe(`game:${gameId}:updates`, (message) => {
          socket.emit('gameUpdate', message);
        });
        
        // Also subscribe to chat and action channels
        const chatSubscriber = await redisClient.subscribe(`game:${gameId}:chat`, (message) => {
          socket.emit('gameChatMessage', message);
        });
        
        const actionSubscriber = await redisClient.subscribe(`game:${gameId}:actions`, (message) => {
          socket.emit('gameAction', message);
        });
        
        // Store subscribers in socket for cleanup
        socket.gameSubscribers = {
          updates: subscriber,
          chat: chatSubscriber,
          actions: actionSubscriber
        };
        
        logger.info(`Subscribed to game updates: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Subscribe to game updates error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to subscribe to game updates' });
      }
    });
    
    // Unsubscribe from game updates
    socket.on('unsubscribeFromGame', async (gameId) => {
      try {
        if (socket.gameSubscribers) {
          // Unsubscribe from all game channels
          if (socket.gameSubscribers.updates) {
            await redisClient.unsubscribe(`game:${gameId}:updates`);
          }
          
          if (socket.gameSubscribers.chat) {
            await redisClient.unsubscribe(`game:${gameId}:chat`);
          }
          
          if (socket.gameSubscribers.actions) {
            await redisClient.unsubscribe(`game:${gameId}:actions`);
          }
          
          socket.gameSubscribers = null;
        }
        
        logger.info(`Unsubscribed from game updates: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Unsubscribe from game updates error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to unsubscribe from game updates' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`, { userId: socket.user.id });
      
      // Clean up any subscriptions
      if (socket.gameSubscribers) {
        try {
          // Get all rooms the socket was in
          const rooms = Array.from(socket.rooms);
          
          // For each room that might be a game room, unsubscribe
          for (const room of rooms) {
            if (room !== socket.id) { // Skip the default room
              await socket.emit('unsubscribeFromGame', room);
            }
          }
        } catch (error) {
          logger.error(`Disconnect cleanup error: ${error.message}`, { userId: socket.user.id });
        }
      }
      
      // Update user status to offline
      User.findByIdAndUpdate(socket.user.id, { isOnline: false, lastActive: Date.now() })
        .catch(err => console.error('Error updating user status:', err));
    });
  });
  
  return io;
};

export default setupSocketHandlers; 