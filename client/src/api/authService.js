import api from './axios';
import log from '../utils/logger';

const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      log.info(response);
      if(response.status == '401'){
        log.info(response.data);
        return response.data;
      }

      return response.data;
    } catch (error) {
      throw error.error[0].message || { message: 'An error occurred during registration' };
    }
  },

  // Login a user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
    
      return response.data;
    } catch (error) {
      throw error.error[0].message || { message: 'An error occurred during login' };
    }
  },

  // Logout a user
  logout: () => {
    localStorage.removeItem('token');
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user profile' };
    }
  },

  // Update user password
  updatePassword: async (passwordData) => {
    try {
      const response = await api.put('/auth/password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update password' };
    }
  },
};

export default authService; 