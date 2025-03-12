import bcrypt from 'bcrypt';
import redisClient from '../config/redis.js';

// Key prefixes for Redis
const KEYS = {
  USER: 'user:',
  USER_BY_EMAIL: 'user:email:',
  USER_BY_USERNAME: 'user:username:',
  USER_LIST: 'users'
};

/**
 * User repository for Redis
 */
class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData) {
    try {
      const { email, username, password } = userData;
      
      // Check if email already exists
      const emailExists = await redisClient.exists(`${KEYS.USER_BY_EMAIL}${email.toLowerCase()}`);
      if (emailExists) {
        throw new Error('Email already in use');
      }
      
      // Check if username already exists
      const usernameExists = await redisClient.exists(`${KEYS.USER_BY_USERNAME}${username.toLowerCase()}`);
      if (usernameExists) {
        throw new Error('Username already in use');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user object
      const timestamp = Date.now();
      const user = {
        id: username, // Using username as ID for simplicity
        email: email.toLowerCase(),
        username,
        password: hashedPassword,
        createdAt: timestamp,
        updatedAt: timestamp,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          kills: 0,
          deaths: 0
        }
      };
      
      // Store user data
      await redisClient.set(`${KEYS.USER}${user.id}`, user);
      
      // Create indexes
      await redisClient.set(`${KEYS.USER_BY_EMAIL}${email.toLowerCase()}`, user.id);
      await redisClient.set(`${KEYS.USER_BY_USERNAME}${username.toLowerCase()}`, user.id);
      
      // Add to user list
      await redisClient.sadd(KEYS.USER_LIST, user.id);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Get a user by ID
   * @param {string} userId - User ID
   * @param {boolean} includePassword - Whether to include password in the result
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserById(userId, includePassword = false) {
    try {
      const user = await redisClient.get(`${KEYS.USER}${userId}`);
      
      if (!user) {
        return null;
      }
      
      if (!includePassword) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      
      return user;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a user by email
   * @param {string} email - User email
   * @param {boolean} includePassword - Whether to include password in the result
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByEmail(email, includePassword = false) {
    try {
      const userId = await redisClient.get(`${KEYS.USER_BY_EMAIL}${email.toLowerCase()}`);
      
      if (!userId) {
        return null;
      }
      
      return this.getUserById(userId, includePassword);
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a user by username
   * @param {string} username - Username
   * @param {boolean} includePassword - Whether to include password in the result
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByUsername(username, includePassword = false) {
    try {
      const userId = await redisClient.get(`${KEYS.USER_BY_USERNAME}${username.toLowerCase()}`);
      
      if (!userId) {
        return null;
      }
      
      return this.getUserById(userId, includePassword);
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated user or null if not found
   */
  async updateUser(userId, updateData) {
    try {
      // Get current user data
      const user = await this.getUserById(userId, true);
      
      if (!user) {
        return null;
      }
      
      // Handle email update
      if (updateData.email && updateData.email.toLowerCase() !== user.email) {
        const emailExists = await redisClient.exists(`${KEYS.USER_BY_EMAIL}${updateData.email.toLowerCase()}`);
        if (emailExists) {
          throw new Error('Email already in use');
        }
        
        // Update email index
        await redisClient.del(`${KEYS.USER_BY_EMAIL}${user.email}`);
        await redisClient.set(`${KEYS.USER_BY_EMAIL}${updateData.email.toLowerCase()}`, userId);
      }
      
      // Handle username update
      if (updateData.username && updateData.username.toLowerCase() !== user.username.toLowerCase()) {
        const usernameExists = await redisClient.exists(`${KEYS.USER_BY_USERNAME}${updateData.username.toLowerCase()}`);
        if (usernameExists) {
          throw new Error('Username already in use');
        }
        
        // Update username index
        await redisClient.del(`${KEYS.USER_BY_USERNAME}${user.username.toLowerCase()}`);
        await redisClient.set(`${KEYS.USER_BY_USERNAME}${updateData.username.toLowerCase()}`, userId);
      }
      
      // Handle password update
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }
      
      // Update user data
      const updatedUser = {
        ...user,
        ...updateData,
        updatedAt: Date.now()
      };
      
      // Store updated user
      await redisClient.set(`${KEYS.USER}${userId}`, updatedUser);
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update user stats
   * @param {string} userId - User ID
   * @param {Object} statsUpdate - Stats to update
   * @returns {Promise<Object|null>} - Updated user or null if not found
   */
  async updateUserStats(userId, statsUpdate) {
    try {
      // Get current user data
      const user = await this.getUserById(userId, true);
      
      if (!user) {
        return null;
      }
      
      // Update stats
      const updatedStats = {
        ...user.stats,
        ...statsUpdate
      };
      
      // Update user
      return this.updateUser(userId, { stats: updatedStats });
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether the user was deleted
   */
  async deleteUser(userId) {
    try {
      // Get current user data
      const user = await this.getUserById(userId, true);
      
      if (!user) {
        return false;
      }
      
      // Remove from indexes
      await redisClient.del(`${KEYS.USER_BY_EMAIL}${user.email}`);
      await redisClient.del(`${KEYS.USER_BY_USERNAME}${user.username.toLowerCase()}`);
      
      // Remove from user list
      await redisClient.srem(KEYS.USER_LIST, userId);
      
      // Remove user data
      await redisClient.del(`${KEYS.USER}${userId}`);
      
      return true;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Verify user password
   * @param {string} userId - User ID
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>} - Whether the password is correct
   */
  async verifyPassword(userId, password) {
    try {
      const user = await this.getUserById(userId, true);
      
      if (!user) {
        return false;
      }
      
      return bcrypt.compare(password, user.password);
    } catch (error) {
      console.error(`Error verifying password for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all users
   * @param {number} limit - Maximum number of users to return
   * @param {number} page - Page number
   * @returns {Promise<Object>} - Users and pagination info
   */
  async getAllUsers(limit = 10, page = 1) {
    try {
      const skip = (page - 1) * limit;
      
      // Get all user IDs
      const userIds = await redisClient.smembers(KEYS.USER_LIST);
      
      // Get total count
      const total = userIds.length;
      
      // Apply pagination
      const paginatedIds = userIds.slice(skip, skip + limit);
      
      // Get user data for each ID
      const users = [];
      for (const id of paginatedIds) {
        const user = await this.getUserById(id);
        if (user) {
          users.push(user);
        }
      }
      
      return {
        users,
        count: users.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const userRepository = new UserRepository();

export default userRepository; 