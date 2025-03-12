import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';
import userRedisService from './user-redis.service.js';

/**
 * Authentication service using Redis for token management
 */
class AuthRedisService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registered user with token
   */
  async register(userData) {
    try {
      // Create user using user service
      const user = await userRedisService.createUser(userData);
      
      // Generate token
      const token = this.generateToken(user.id);
      
      // Store token in Redis
      await this.storeToken(user.id, token);
      
      return {
        user,
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Authenticated user with token
   */
  async login(email, password) {
    try {
      // Authenticate user
      const user = await userRedisService.authenticateUser(email, password);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Generate token
      const token = this.generateToken(user.id);
      
      // Store token in Redis
      await this.storeToken(user.id, token);
      
      return {
        user,
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Logout a user
   * @param {string} userId - User ID
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} - True if successful
   */
  async logout(userId, token) {
    try {
      // Add token to blacklist
      await redisClient.set(`token:blacklist:${token}`, 'blacklisted', 
        parseInt(process.env.JWT_EXPIRY_SECONDS || 604800)); // Default 7 days
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Verify a token
   * @param {string} token - JWT token
   * @returns {Promise<Object|null>} - Decoded token or null if invalid
   */
  async verifyToken(token) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.exists(`token:blacklist:${token}`);
      if (isBlacklisted) {
        return null;
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user
      const user = await userRedisService.getUserById(decoded.id);
      if (!user) {
        return null;
      }
      
      return {
        user,
        decoded
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate a JWT token
   * @param {string} userId - User ID
   * @returns {string} - JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
  }
  
  /**
   * Store a token in Redis
   * @param {string} userId - User ID
   * @param {string} token - JWT token
   * @returns {Promise<void>}
   */
  async storeToken(userId, token) {
    // Store token with user ID
    await redisClient.set(
      `token:${token}`,
      userId,
      parseInt(process.env.JWT_EXPIRY_SECONDS || 604800) // Default 7 days
    );
    
    // Add token to user's tokens set
    await redisClient.sadd(`user:${userId}:tokens`, token);
  }
  
  /**
   * Invalidate all tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - True if successful
   */
  async invalidateAllTokens(userId) {
    try {
      // Get all tokens for user
      const tokens = await redisClient.smembers(`user:${userId}:tokens`);
      
      // Add all tokens to blacklist
      const expirySeconds = parseInt(process.env.JWT_EXPIRY_SECONDS || 604800);
      await Promise.all(
        tokens.map(token => 
          redisClient.set(`token:blacklist:${token}`, 'blacklisted', expirySeconds)
        )
      );
      
      // Clear user's tokens set
      await redisClient.del(`user:${userId}:tokens`);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

// Create and export a singleton instance
const authRedisService = new AuthRedisService();
export default authRedisService; 