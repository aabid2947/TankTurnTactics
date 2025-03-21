import authRedisService from '../services/auth-redis.service.js';
import loggerObj from '../utils/logger.js';

/**
 * Authentication controller
 */

const {logger} = loggerObj;
class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { email, username, password } = req.body;
      
      // Validate required fields
      if (!email || !username || !password) {
        
        return res.status(400).json({
          success: false,
          error: 'Please provide email, username, and password'
        });
      }
      
      const result = await authRedisService.register({ email, username, password });
      
      logger.info(`User registered: ${username}`, { email });
      
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      logger.error(`Registration error: ${error.message}`, { email: req.body.email });
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Login a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email and password'
        });
      }
      
      const result = await authRedisService.login(email, password);
      
      logger.info(`User logged in: ${result.user.username}`, { email });
      
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`, { email: req.body.email });
      
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  }
  
  /**
   * Logout a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      await authRedisService.logout(req.user.id, token);
      
      logger.info(`User logged out: ${req.user.username}`, { userId: req.user.id });
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error(`Logout error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }
  
  /**
   * Get current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      logger.error(`Get current user error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }
  
  /**
   * Update user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Please provide current password and new password'
        });
      }
      
      // Verify current password
      const isValid = await authRedisService.verifyPassword(req.user.id, currentPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
      // Update password
      await authRedisService.updatePassword(req.user.id, newPassword);
      
      // Invalidate all tokens
      await authRedisService.invalidateAllTokens(req.user.id);
      
      logger.info(`Password updated for user: ${req.user.username}`, { userId: req.user.id });
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error(`Update password error: ${error.message}`, { userId: req.user.id });
      
      res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }
}

// Create a singleton instance
const authController = new AuthController();

export default authController; 