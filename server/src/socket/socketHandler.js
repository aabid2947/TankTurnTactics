import jwt from 'jsonwebtoken';
import userRedisService from '../services/user-redis.service.js';
import gameRedisService from '../services/game-redis.service.js';
import authRedisService from '../services/auth-redis.service.js';
import logObj from '../utils/logger.js';
import redisClient from '../config/redis.js';

const { logger } = logObj;

const setupSocketHandlers = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const result = await authRedisService.verifyToken(token);
      if (!result) return next(new Error('Authentication error'));

      // Attach user to socket
      socket.user = result.user;

      // Mark user as online in Redis
      await userRedisService.updateUserStatus(socket.user.id, true);

      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`, { userId: socket.user.id });


    // Retrieve the previous game ID from Redis
    const previousGameId = redisClient.get(`user:${socket.user.id}:currentGame`);

    if (previousGameId) {
      console.log(`Rejoining previous game: ${previousGameId}`);
      socket.join(previousGameId);
    }
    // Store the socket in Redis for real-time tracking
    redisClient.sadd(`user:${socket.user.id}:sockets`, socket.id);

    // Join user to their own private room for direct messages
    socket.join(`user:${socket.user.id}`);

    // Handle game join
    socket.on('joinGame', async (gameId) => {
      try {

        if (gameId === undefined || gameId === null) {
          console.log("gameId is undefined or null!");
        } else {
          console.log("gameId:", gameId);
        }


        const game = await gameRedisService.getGameById(gameId);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }


        // Ensure user is a player
        const clients = await io.in(gameId).fetchSockets();
        console.log(`Clients in room ${gameId}:`, clients.map(client => client.id));


       
        if (socket.user.id === game.createdBy) {
          console.log(`User ${socket.user.id} is the game creator and is creating the room.`);
          socket.join(gameId);
        } else {

          const isPlayerInGame = game.players.some(player => player.userId === socket.user.id);
          if (!isPlayerInGame) {
            socket.emit('error', { message: 'You are not a player in this game' });
            return;
          }

          console.log(`User ${socket.user.id} is joining an existing game room.`);
          socket.join(gameId);
        }


        // Store user's current game in Redis for rejoining after disconnect
        redisClient.set(`user:${socket.user.id}:currentGame`, gameId);


        // Notify other players
        socket.to(gameId).emit('playerJoined', {
          gameId: gameId,
          userId: socket.user.id,
          username: socket.user.username,
        });

        logger.info(`Player joined game room: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Join game error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });

    // Handle game leave
    socket.on('leaveGame', async (gameId) => {
      try {
        socket.leave(gameId);

        // Notify other players
        socket.emit('playerLeft', {
          userId: socket.user.id,
          username: socket.user.username,
        });

        logger.info(`Player left game room: ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Leave game error: ${error.message}`, { userId: socket.user.id, gameId });
      }
    });

    // Handle game start
    socket.on('startGame', async (gameId) => {
      try {
        // get updated gaem from redis 
        const game = await gameRedisService.getGameById(gameId);

        // Notify other players
        io.to(gameId).emit('gameStarted', {
          gameId: gameId,
          data: game,
        });

        logger.info(`game has started: ${gameId}`);
      } catch (error) {
        logger.error(`Leave game error: ${error.message}`);
      }
    });

    // Handle Action:Move
    socket.on('movePlayer', async ({gameId,moveData}) => {
      try {
        console.log(moveData)
        // get updated game from redis 
        const game = await gameRedisService.movePlayer(gameId,socket.user.id,moveData.newX,moveData.newY);

        
        // Notify other players
        io.to(gameId).emit('playerMoved', {
          gameId:gameId,
          data:game
        });

        logger.info(`The Player has moved: ${gameId}`);
      } catch (error) {
        logger.error(`Error in moving the player: ${error.message}`);
      }
    });

    // Handle Action:shoot
    socket.on('shootPlayer', async ({gameId,shootData}) => {
      try {
        console.log(gameId,shootData)
        // get updated game from redis 
        const game = await gameRedisService.shootPlayer(gameId,socket.user.id,shootData.targetX,shootData.targetY);

        
        // Notify other players
        io.to(gameId).emit('playerShot', {
          gameId:gameId,
          data:game
        });

        logger.info(`The Player has been shot: ${gameId}`);
      } catch (error) {
        logger.error(`Error in shooting the player: ${error.message}`);
      }
    });

    // Handle Action:Increase Range 
    socket.on('increaseRange', async ({gameId}) => {
      try {
        // get updated game from redis
        const game = await gameRedisService.increaseRange(gameId,socket.user.id);

        
        // Notify other players
        io.to(gameId).emit('rangeIncreased', {
          gameId:gameId,
          data:game
        });
        console.log(game.board[11][12])

        logger.info(`The Range has been increased: ${gameId}`);
      } catch (error) {
        logger.error(`Error in increasing the range  : ${error.message}`);
      }
    });

    // Handle Action:Transfer Action Point 
    socket.on('transferAP', async ({gameId,transferData}) => {
      try {
        console.log(transferData.targetX,transferData.targetY)
        // get updated game from redis 
        const game = await gameRedisService.transferActionPoints(gameId,socket.user.id,transferData.targetX,transferData.targetY);

        
        // Notify other players
        io.to(gameId).emit('apTransferred', {
          gameId:gameId,
          data:game
        });

        logger.info(`The Action Point has been transferred: ${gameId}`);
      } catch (error) {
        logger.error(`Error in transferring action point: ${error.message}`);
      }
    });

    // // 
    // socket.on('updateGameState', async (gameId)=>{
    //   try {
    //     const game = await redisClient.getGameById(gameId)

    //     if (!game) {
    //       socket.emit('error', { message: 'Game not found' });
    //       return;
    //     }


    //   } catch (error) {

    //   }
    // })

    // Handle chat messages
    socket.on('gameChatMessage', async ({ gameId, message }) => {
      try {
        const chatMessage = {
          userId: socket.user.id,
          username: socket.user.username,
          message,
          timestamp: new Date().toISOString(),
        };

        await gameRedisService.addChatMessage(gameId, chatMessage);

        // Broadcast to all players in the game
        io.to(gameId).emit('gameChatMessage', chatMessage);

        // Publish chat event to Redis
        await redisClient.publish(`game:${gameId}:chat`, JSON.stringify(chatMessage));

        logger.info(`Chat message in game ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Chat message error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to send chat message' });
      }
    });

    // Handle game actions (move, shoot, upgrade, trade)
    socket.on('gameAction', async ({ gameId, action }) => {
      try {
        const game = await gameRedisService.getGameById(gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Ensure user is a player
        const isPlayerInGame = game.players.some(player => player.userId === socket.user.id);
        if (!isPlayerInGame) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // Process action
        let result;
        switch (action.type) {
          case 'move':
            result = await gameRedisService.movePlayer(gameId, socket.user.id, action.newX, action.newY);
            break;
          case 'shoot':
            result = await gameRedisService.shootPlayer(gameId, socket.user.id, action.targetX, action.targetY);
            break;
          case 'upgrade':
            result = await gameRedisService.upgradeRange(gameId, socket.user.id);
            break;
          case 'trade':
            result = await gameRedisService.tradeActionPoints(gameId, socket.user.id, action.targetUserId, action.amount);
            break;
          default:
            socket.emit('error', { message: 'Invalid action type' });
            return;
        }

        // Publish event
        const gameAction = {
          userId: socket.user.id,
          username: socket.user.username,
          action,
          timestamp: new Date().toISOString(),
        };

        io.to(gameId).emit('gameAction', gameAction);
        await redisClient.publish(`game:${gameId}:actions`, JSON.stringify(gameAction));

        logger.info(`Game action: ${action.type} in game ${gameId}`, { userId: socket.user.id, gameId });
      } catch (error) {
        logger.error(`Game action error: ${error.message}`, { userId: socket.user.id, gameId });
        socket.emit('error', { message: 'Failed to perform action' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} -> Reason ${reason}`, { userId: socket.user.id });
      console.log(socket.id)
      // Remove socket from Redis
      redisClient.srem(`${socket.user.id}:sockets`, String(socket.id));
      // Check if user has any other active sockets
      const remainingSockets = await redisClient.sadd(`${socket.user.id}:sockets`, String(socket.id));

      if (remainingSockets === 0) {
        await userRedisService.updateUserStatus(socket.user.id, false);
      }
    });
  });

  return io;
};

export default setupSocketHandlers;
