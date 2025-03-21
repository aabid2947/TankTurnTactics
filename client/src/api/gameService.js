import api from './axios';

const gameService = {
  // Create a new game
  createGame: async (gameData) => {
    try {
      const response = await api.post('/game', gameData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create game' };
    }
  },

  // Get all games
  getAllGames: async () => {
    try {
      const response = await api.get('/game');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch games' };
    }
  },

  // Get a game by ID
  getGameById: async (gameId) => {
    try {
      const response = await api.get(`/game/${gameId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch game' };
    }
  },

  // Join a game
  joinGame: async (gameId) => {
    try {
      
      const response = await api.post(`/game/${gameId}/join`);
      console.log(response)
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to join game' };
    }
  },

  leaveGame: async (gameId) => {
    try {
      const response = await api.post(`/game/${gameId}/leave`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to leave the  game' };
    }
  },

  // Start a game
  startGame: async (gameId) => {
    try {
      const response = await api.post(`/game/${gameId}/start`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to start game' };
    }
  },

  // Move a player
  movePlayer: async (gameId, moveData) => {
    try {
      const response = await api.post(`/game/${gameId}/move`, moveData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to move player' };
    }
  },

  // Shoot a player
  shootPlayer: async (gameId, shootData) => {
    try {
      const response = await api.post(`/game/${gameId}/shoot`, shootData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to shoot player' };
    }
  },

  // Upgrade player range
  upgradeRange: async (gameId) => {
    try {
      const response = await api.post(`/game/${gameId}/upgrade`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upgrade range' };
    }
  },

  // Trade action points
  tradeActionPoints: async (gameId, tradeData) => {
    try {
      const response = await api.post(`/game/${gameId}/trade`, tradeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to trade action points' };
    }
  },

  // Get game history
  getGameHistory: async (gameId) => {
    try {
      const response = await api.get(`/game/${gameId}/history`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch game history' };
    }
  },
};

export default gameService; 