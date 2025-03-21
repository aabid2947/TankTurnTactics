import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid'; // Use UUID for unique user IDs
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
    if (emailExists) throw new Error('Email already in use');

    const usernameExists = await redisClient.exists(`user:username:${username}`);
    if (usernameExists) throw new Error('Username already in use');

    // Generate a unique user ID using UUID
    const userId = `user:${uuidv4()}`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const user = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      isOnline: false, // Default offline
      lastActive: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalKills: 0,
        totalDeaths: 0
      }
    };

    // Store user in Redis (JSON.stringify required)
    await redisClient.set(userId, JSON.stringify(user));

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
    const userData = await redisClient.get(userId);
    if (!userData) return null;

    const user = JSON.parse(userData);
    delete user.password; // Remove password before returning
    return user;
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
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Update user data
    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Store updated user
    await redisClient.set(userId, JSON.stringify(updatedUser));

    return updatedUser;
  }

  /**
   * Update user status (online/offline)
   * @param {string} userId - User ID
   * @param {boolean} isOnline - User online status
   */
  async updateUserStatus(userId, isOnline) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    user.isOnline = isOnline;
    user.lastActive = Date.now();

    await redisClient.set(userId, JSON.stringify(user));
  }

  /**
   * Authenticate a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object|null>} - User data if authenticated, null otherwise
   */
  async authenticateUser(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    // Return user without password
    delete user.password;
    return user;
  }

  /**
   * Update user stats
   * @param {string} userId - User ID
   * @param {Object} statsUpdate - Stats to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateUserStats(userId, statsUpdate) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Update stats
    user.stats = {
      ...user.stats,
      ...statsUpdate
    };
    user.updatedAt = new Date().toISOString();

    await redisClient.set(userId, JSON.stringify(user));

    return user;
  }

  /**
   * Get user stats
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User stats
   */
  async getUserStats(userId) {
    const user = await this.getUserById(userId);
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
        const user = await this.getUserById(userId);
        return user || null;
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
