import bcrypt from 'bcrypt';
import redisClient from '../config/redis.js';

/**
 * User service using Redis for data storage
 */
class UserRedisService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData) {
    const { email, username, password } = userData;
    
    // Check if user already exists
    const emailExists = await redisClient.exists(`user:email:${email}`);
    if (emailExists) {
      throw new Error('Email already in use');
    }
    
    const usernameExists = await redisClient.exists(`user:username:${username}`);
    if (usernameExists) {
      throw new Error('Username already in use');
    }
    
    // Generate user ID
    const userId = `user:${Date.now()}`;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user object
    const user = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalKills: 0
      }
    };
    
    // Store user in Redis
    await redisClient.set(userId, user);
    
    // Create indexes for email and username
    await redisClient.set(`user:email:${email}`, userId);
    await redisClient.set(`user:username:${username}`, userId);
    
    // Add to users set
    await redisClient.sadd('users', userId);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Get a user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserById(userId) {
    const user = await redisClient.get(userId);
    if (!user) return null;
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Get a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByEmail(email) {
    const userId = await redisClient.get(`user:email:${email}`);
    if (!userId) return null;
    
    return await this.getUserById(userId);
  }
  
  /**
   * Get a user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByUsername(username) {
    const userId = await redisClient.get(`user:username:${username}`);
    if (!userId) return null;
    
    return await this.getUserById(userId);
  }
  
  /**
   * Update a user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, updateData) {
    const user = await redisClient.get(userId);
    if (!user) throw new Error('User not found');
    
    // Update user data
    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Store updated user
    await redisClient.set(userId, updatedUser);
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
  
  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Updated user
   */
  async updatePassword(userId, newPassword) {
    const user = await redisClient.get(userId);
    if (!user) throw new Error('User not found');
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user with new password
    const updatedUser = {
      ...user,
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    };
    
    // Store updated user
    await redisClient.set(userId, updatedUser);
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
  
  /**
   * Authenticate a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object|null>} - User data if authenticated, null otherwise
   */
  async authenticateUser(email, password) {
    // Get user ID by email
    const userId = await redisClient.get(`user:email:${email}`);
    if (!userId) return null;
    
    // Get full user data including password
    const user = await redisClient.get(userId);
    if (!user) return null;
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Update user stats
   * @param {string} userId - User ID
   * @param {Object} statsUpdate - Stats to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateUserStats(userId, statsUpdate) {
    const user = await redisClient.get(userId);
    if (!user) throw new Error('User not found');
    
    // Update stats
    const updatedUser = {
      ...user,
      stats: {
        ...user.stats,
        ...statsUpdate
      },
      updatedAt: new Date().toISOString()
    };
    
    // Store updated user
    await redisClient.set(userId, updatedUser);
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
  
  /**
   * Get user stats
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User stats
   */
  async getUserStats(userId) {
    const user = await redisClient.get(userId);
    if (!user) throw new Error('User not found');
    
    return user.stats;
  }
  
  /**
   * Get top users by wins
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} - Array of top users
   */
  async getTopUsersByWins(limit = 10) {
    // Get all users
    const userIds = await redisClient.smembers('users');
    
    // Get user data for each ID
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const user = await redisClient.get(userId);
        if (!user) return null;
        
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      })
    );
    
    // Filter out null values and sort by wins
    return users
      .filter(user => user !== null)
      .sort((a, b) => b.stats.gamesWon - a.stats.gamesWon)
      .slice(0, limit);
  }
}

// Create and export a singleton instance
const userRedisService = new UserRedisService();
export default userRedisService; 