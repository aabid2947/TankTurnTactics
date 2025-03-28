// Import necessary hooks and modules from React
import { createContext, useState, useEffect, useContext } from 'react';
// Import our auth service methods (register, login, etc.)
import { authService } from '../api';
// Import jwtDecode to decode JSON Web Tokens for validity checks
import { jwtDecode } from 'jwt-decode';

// Create the authentication context that will be used by our components
const AuthContext = createContext();

// AuthProvider component to wrap around parts of the app that need access to authentication data
const AuthProvider = ({ children }) => {
  // Initialize currentUser state from localStorage, if it exists.
  // This allows the user information to persist across page refreshes.
  const [currentPlayer, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('currentPlayer');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  // Initialize isAuthenticated state from localStorage to determine if the user is logged in
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Convert stored string to boolean; it will be 'true' if the user is authenticated
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  // loading indicates whether we are fetching user data or processing an auth request
  const [loading, setLoading] = useState(true);
  // error holds any error message encountered during authentication actions
  const [error, setError] = useState(localStorage.getItem('authError') || null);

  /**
   * Helper function to validate the token.
   * This function decodes the token and checks if its expiration time is in the future.
   * @param {string} token - The JWT token to be validated.
   * @returns {boolean} - Returns true if token is valid, otherwise false.
   */
  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      // Multiply by 1000 to convert seconds to milliseconds for Date.now() comparison
      return decoded.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  };

  /**
   * useEffect hook runs when the component mounts.
   * It attempts to load the current user based on the stored token.
   */
  useEffect(() => {
    // Define an asynchronous function to load the user
    const loadUser = async () => {
      setLoading(true); // Set loading state while fetching data
      try {
        // Retrieve the token from localStorage
        const token = localStorage.getItem('token');
        // Check if token exists and is valid
        if (token && isTokenValid(token)) {
          // If valid, fetch current user data from the authService
          const userData = await authService.getCurrentUser();
          // Update state with the fetched user data
          setCurrentUser(userData);
          setIsAuthenticated(true);
          // Persist the user data and authentication status in localStorage
          localStorage.setItem('currentPlayer', JSON.stringify(userData));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          // If token is missing or invalid, clear relevant data from localStorage and state
          localStorage.removeItem('token');
          localStorage.removeItem('currentPlayer');
          localStorage.removeItem('isAuthenticated');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // In case of errors (like API failure), log the error and clear stored data
        console.error('Failed to load user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('currentPlayer');
        localStorage.removeItem('isAuthenticated');
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        // Regardless of success or failure, turn off the loading state
        setLoading(false);
      }
    };

    // Call the loadUser function once when the component mounts
    loadUser();
  }, []); // Empty dependency array means this effect runs only once

  /**
   * Function to register a new user.
   * This sends user data to the authService and handles the response.
   * @param {Object} userData - The data for the new user registration.
   * @returns {Object} - Returns response data from the registration service.
   */
  const register = async (userData) => {
    setLoading(true);  // Begin loading while the request is processed
    setError(null);    // Clear any previous errors
    localStorage.removeItem('authError'); // Remove error from storage before request
    try {
      // Call the registration endpoint from authService
      const response = await authService.register(userData);
      
      // If a token is returned, registration is successful
      if (response.data.token) {
        localStorage.setItem('token', response.data.token); // Store token for future requests
        setCurrentUser(response.data.user); // Update state with user data
        setIsAuthenticated(true);           // Set authentication status to true
        // Persist user information and auth status in localStorage
        localStorage.setItem('currentPlayer', JSON.stringify(response.data.user));
        localStorage.setItem('isAuthenticated', 'true');
      }
      return response.data;
    } catch (error) {
      // On error, extract the message and update state and localStorage
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      localStorage.setItem('authError', errorMessage);
      throw error;
    } finally {
      // Stop loading regardless of the outcome
      setLoading(false);
    }
  };

  /**
   * Function to log in a user.
   * Sends credentials to the authService and updates the state on successful login.
   * @param {Object} credentials - The user's login credentials.
   * @returns {Object} - Returns response data from the login service.
   */
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    localStorage.removeItem('authError');
    try {
      // Call the login endpoint from authService
      const response = await authService.login(credentials);
      // Check if a token is provided in the response
      if (response.data.token) {
        localStorage.setItem('token', response.data.token); // Save the token
        setCurrentUser(response.data.user); // Update state with user data
        setIsAuthenticated(true);           // Mark the user as authenticated
        // Persist the current user and auth status in localStorage
        localStorage.setItem('currentPlayer', JSON.stringify(response.data.user));
        localStorage.setItem('isAuthenticated', 'true');
      }
      return response.data;
    } catch (error) {
      // Extract error message from response or use a default message
      const errorMessage = error.errors?.[0]?.message || 'Login failed';
      setError(errorMessage);
      localStorage.setItem('authError', errorMessage);
      return error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Function to log out the current user.
   * Clears all relevant authentication data from state and localStorage.
   */
  const logout = async () => {
    authService.logout();  // Optionally call an API endpoint to handle logout on the server
    setCurrentUser(null);
    setIsAuthenticated(false);
    // Clear all authentication related data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('currentPlayer');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authError');
  };

  /**
   * Function to update the user's password.
   * @param {Object} passwordData - The data required for updating the password.
   * @returns {Object} - Returns response data from the update password service.
   */
  const updatePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    localStorage.removeItem('authError');
    try {
      // Call the password update endpoint from authService
      const response = await authService.updatePassword(passwordData);
      return response;
    } catch (error) {
      // On error, set and store an error message
      const errorMessage = error.message || 'Failed to update password';
      setError(errorMessage);
      localStorage.setItem('authError', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Define the value object that will be provided to consuming components.
  // It includes the current user, authentication status, error state, loading state,
  // and all the authentication related functions.
  const value = {
    currentPlayer,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    updatePassword,
  };

  // Return the context provider with the defined value to wrap around child components.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to access the authentication context in components
const useAuth = () => {
  const context = useContext(AuthContext);
  // Ensure that the hook is used within an AuthProvider component
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the AuthProvider and useAuth hook for use in other parts of the application
export { AuthProvider, useAuth };
