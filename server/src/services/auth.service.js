// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcrypt';
// import userRepository from '../repositories/user.repository.js';
// import config from '../config/config.js';
// import logger from '../utils/logger.js';

// /**
//  * Authentication service
//  */
// class AuthService {
//   /**
//    * Register a new user
//    * @param {Object} userData - User registration data
//    * @returns {Promise<Object>} - Registered user
//    */
//   async register(userData) {
//     try {
//       // Validate required fields
//       if (!userData.email || !userData.username || !userData.password) {
//         throw new Error('Email, username, and password are required');
//       }
      
//       // Create user
//       const user = await userRepository.createUser(userData);
      
//       // Generate token
//       const token = this.generateToken(user);
      
//       return {
//         user,
//         token
//       };
//     } catch (error) {
//       logger.error(`Registration error: ${error.message}`, { userData: { ...userData, password: '[REDACTED]' } });
//       throw error;
//     }
//   }
  
//   /**
//    * Login a user
//    * @param {Object} credentials - Login credentials
//    * @returns {Promise<Object>} - Logged in user and token
//    */
//   async login(credentials) {
//     try {
//       // Validate required fields
//       if (!credentials.username && !credentials.email) {
//         throw new Error('Username or email is required');
//       }
      
//       if (!credentials.password) {
//         throw new Error('Password is required');
//       }
      
//       // Find user by username or email
//       let user;
//       if (credentials.email) {
//         user = await userRepository.getUserByEmail(credentials.email, true);
//       } else {
//         user = await userRepository.getUserByUsername(credentials.username, true);
//       }
      
//       if (!user) {
//         throw new Error('Invalid credentials');
//       }
      
//       // Verify password
//       const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      
//       if (!isPasswordValid) {
//         throw new Error('Invalid credentials');
//       }
      
//       // Remove password from user object
//       const { password, ...userWithoutPassword } = user;
      
//       // Generate token
//       const token = this.generateToken(userWithoutPassword);
      
//       return {
//         user: userWithoutPassword,
//         token
//       };
//     } catch (error) {
//       logger.error(`Login error: ${error.message}`, { 
//         credentials: { 
//           ...credentials, 
//           password: '[REDACTED]' 
//         } 
//       });
//       throw error;
//     }
//   }
  
//   /**
//    * Generate JWT token
//    * @param {Object} user - User data
//    * @returns {string} - JWT token
//    */
//   generateToken(user) {
//     return jwt.sign(
//       { id: user.id, username: user.username },
//       config.jwt.secret,
//       { expiresIn: config.jwt.expiresIn }
//     );
//   }
  
//   /**
//    * Verify JWT token
//    * @param {string} token - JWT token
//    * @returns {Promise<Object>} - Decoded token
//    */
//   async verifyToken(token) {
//     try {
//       const decoded = jwt.verify(token, config.jwt.secret);
      
//       // Check if user exists
//       const user = await userRepository.getUserById(decoded.id);
      
//       if (!user) {
//         throw new Error('User not found');
//       }
      
//       return decoded;
//     } catch (error) {
//       logger.error(`Token verification error: ${error.message}`);
//       throw error;
//     }
//   }
  
//   /**
//    * Get user from token
//    * @param {string} token - JWT token
//    * @returns {Promise<Object>} - User data
//    */
//   async getUserFromToken(token) {
//     try {
//       const decoded = await this.verifyToken(token);
//       return userRepository.getUserById(decoded.id);
//     } catch (error) {
//       logger.error(`Get user from token error: ${error.message}`);
//       throw error;
//     }
//   }
  
//   /**
//    * Change user password
//    * @param {string} userId - User ID
//    * @param {string} currentPassword - Current password
//    * @param {string} newPassword - New password
//    * @returns {Promise<Object>} - Updated user
//    */
//   async changePassword(userId, currentPassword, newPassword) {
//     try {
//       // Verify current password
//       const isPasswordValid = await userRepository.verifyPassword(userId, currentPassword);
      
//       if (!isPasswordValid) {
//         throw new Error('Current password is incorrect');
//       }
      
//       // Update password
//       return userRepository.updateUser(userId, { password: newPassword });
//     } catch (error) {
//       logger.error(`Change password error: ${error.message}`, { userId });
//       throw error;
//     }
//   }
// }

// // Create a singleton instance
// const authService = new AuthService();

// export default authService; 