import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

const KEYS = {
  CHAT_ROOM: 'chat:room:',
  CHAT_MESSAGES: 'chat:messages:',
  USER_CHATS: 'user:chats:',
  GAME_CHAT: 'game:chat:',
  PRIVATE_CHAT: 'private:chat:'
};

class ChatRedisService {
  /**
   * Create a new chat room
   * @param {string} gameId - Game ID
   * @returns {Promise<string>} - Room ID
   */
  async createChatRoom(gameId) {
    try {
      const roomId = `game:${gameId}`;
      await redisClient.set(`${KEYS.CHAT_ROOM}${roomId}`, JSON.stringify({
        id: roomId,
        type: 'game',
        gameId,
        createdAt: Date.now()
      }));
      return roomId;
    } catch (error) {
      logger.error(`Error creating chat room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a private chat room between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<string>} - Room ID
   */
  async createPrivateChatRoom(userId1, userId2) {
    try {
      const roomId = `private:${[userId1, userId2].sort().join(':')}`;
      await redisClient.set(`${KEYS.CHAT_ROOM}${roomId}`, JSON.stringify({
        id: roomId,
        type: 'private',
        participants: [userId1, userId2],
        createdAt: Date.now()
      }));

      // Add room to users' chat lists
      await redisClient.sadd(`${KEYS.USER_CHATS}${userId1}`, roomId);
      await redisClient.sadd(`${KEYS.USER_CHATS}${userId2}`, roomId);

      return roomId;
    } catch (error) {
      logger.error(`Error creating private chat room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a message to a chat room
   * @param {string} roomId - Room ID
   * @param {Object} message - Message data
   * @returns {Promise<Object>} - Added message
   */
  async addMessage(roomId, message) {
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };

      // Add message to room's message list
      await redisClient.rpush(
        `${KEYS.CHAT_MESSAGES}${roomId}`,
        JSON.stringify(messageWithTimestamp)
      );

      // Trim message list to keep only last 100 messages
      await redisClient.ltrim(`${KEYS.CHAT_MESSAGES}${roomId}`, -100, -1);

      return messageWithTimestamp;
    } catch (error) {
      logger.error(`Error adding message to chat room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get messages from a chat room
   * @param {string} roomId - Room ID
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise<Array>} - Array of messages
   */
  async getMessages(roomId, limit = 50) {
    try {
      const messages = await redisClient.lrange(
        `${KEYS.CHAT_MESSAGES}${roomId}`,
        -limit,
        -1
      );
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      logger.error(`Error getting messages from chat room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's chat rooms
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of room IDs
   */
  async getUserChatRooms(userId) {
    try {
      const roomIds = await redisClient.smembers(`${KEYS.USER_CHATS}${userId}`);
      const rooms = await Promise.all(
        roomIds.map(async (roomId) => {
          const roomData = await redisClient.get(`${KEYS.CHAT_ROOM}${roomId}`);
          return roomData ? JSON.parse(roomData) : null;
        })
      );
      return rooms.filter(room => room !== null);
    } catch (error) {
      logger.error(`Error getting user chat rooms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat room details
   * @param {string} roomId - Room ID
   * @returns {Promise<Object>} - Room details
   */
  async getChatRoom(roomId) {
    try {
      const roomData = await redisClient.get(`${KEYS.CHAT_ROOM}${roomId}`);
      return roomData ? JSON.parse(roomData) : null;
    } catch (error) {
      logger.error(`Error getting chat room: ${error.message}`);
      throw error;
    }
  }
}

export default new ChatRedisService(); 