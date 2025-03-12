import userRedisService from '../services/user-redis.service.js';
import gameRedisService from '../services/game-redis.service.js';
import logger from '../utils/logger.js';

/**
 * User controller
 */
class UserController {
  /**
   * Get user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await userRedisService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error(`Get user profile error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  }
  
  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username, email } = req.body;
      
      // Update user profile
      const updatedUser = await userRedisService.updateUser(userId, {
        username,
        email
      });
      
      logger.info(`User profile updated: ${userId}`, { userId });
      
      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      logger.error(`Update user profile error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile'
      });
    }
  }
  
  /**
   * Get user stats
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await userRedisService.getUserStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Get user stats error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user stats'
      });
    }
  }
  
  /**
   * Get user games
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserGames(req, res) {
    try {
      const userId = req.user.id;
      const games = await gameRedisService.getAllGames();
      
      // Filter games where user is a player
      const userGames = games.filter(game => 
        game.players.some(player => player.userId === userId)
      );
      
      res.status(200).json({
        success: true,
        count: userGames.length,
        data: userGames
      });
    } catch (error) {
      logger.error(`Get user games error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user games'
      });
    }
  }
  
  /**
   * Get top users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopUsers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const topUsers = await userRedisService.getTopUsersByWins(limit);
      
      res.status(200).json({
        success: true,
        count: topUsers.length,
        data: topUsers
      });
    } catch (error) {
      logger.error(`Get top users error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get top users'
      });
    }
  }
}

// Create a singleton instance
const userController = new UserController();

export default userController; 