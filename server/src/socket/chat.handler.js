import chatRedisService from '../services/chat-redis.service.js';
import logger from '../utils/logger.js';

class ChatHandler {
  constructor(io) {
    this.io = io;
    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.user.id;

      // Join user's private room for direct messages
      socket.join(`user:${userId}`);

      // Handle joining a chat room
      socket.on('joinChatRoom', async (roomId) => {
        try {
          const room = await chatRedisService.getChatRoom(roomId);
          if (!room) {
            socket.emit('error', { message: 'Chat room not found' });
            return;
          }

          // Join the room
          socket.join(roomId);

          // Get recent messages
          const messages = await chatRedisService.getMessages(roomId);
          socket.emit('chatHistory', { roomId, messages });

          // Notify others in the room
          socket.to(roomId).emit('userJoinedChat', {
            userId,
            username: socket.user.username,
            roomId
          });

          logger.info(`User ${socket.user.username} joined chat room ${roomId}`);
        } catch (error) {
          logger.error(`Error joining chat room: ${error.message}`);
          socket.emit('error', { message: 'Failed to join chat room' });
        }
      });

      // Handle leaving a chat room
      socket.on('leaveChatRoom', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('userLeftChat', {
          userId,
          username: socket.user.username,
          roomId
        });
        logger.info(`User ${socket.user.username} left chat room ${roomId}`);
      });

      // Handle sending a message
      socket.on('sendMessage', async ({ roomId, message }) => {
        try {
          const room = await chatRedisService.getChatRoom(roomId);
          if (!room) {
            socket.emit('error', { message: 'Chat room not found' });
            return;
          }

          const messageData = {
            userId,
            username: socket.user.username,
            message,
            roomId
          };

          // Save message to Redis
          const savedMessage = await chatRedisService.addMessage(roomId, messageData);

          // Broadcast to room
          this.io.to(roomId).emit('newMessage', savedMessage);

          logger.info(`User ${socket.user.username} sent message in room ${roomId}`);
        } catch (error) {
          logger.error(`Error sending message: ${error.message}`);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle starting a private chat
      socket.on('startPrivateChat', async (targetUserId) => {
        try {
          const roomId = await chatRedisService.createPrivateChatRoom(userId, targetUserId);
          
          // Join the room
          socket.join(roomId);
          
          // Get recent messages
          const messages = await chatRedisService.getMessages(roomId);
          socket.emit('chatHistory', { roomId, messages });

          // Notify target user
          this.io.to(`user:${targetUserId}`).emit('newPrivateChat', {
            roomId,
            userId,
            username: socket.user.username
          });

          logger.info(`Private chat started between ${socket.user.username} and user ${targetUserId}`);
        } catch (error) {
          logger.error(`Error starting private chat: ${error.message}`);
          socket.emit('error', { message: 'Failed to start private chat' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Clean up any necessary resources
        logger.info(`User ${socket.user.username} disconnected from chat`);
      });
    });
  }
}

export default ChatHandler; 