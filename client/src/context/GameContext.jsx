import { createContext, useState, useEffect, useContext } from 'react';
import { gameService, socketService } from '../api';
import { useAuth } from './AuthContext';

// Create the game context
const GameContext = createContext();

// Custom hook to use the game context
export const useGame = () => {
  return useContext(GameContext);
};

// Game provider component
export const GameProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const socketInstance = socketService.initSocket();
      setSocket(socketInstance);

      // Socket event listeners
      socketInstance.on('playerJoined', (data) => {
        if (currentGame && data.gameId === currentGame._id) {
          setCurrentGame((prev) => ({
            ...prev,
            players: [...prev.players, data.player],
          }));
        }
      });

      socketInstance.on('playerLeft', (data) => {
        if (currentGame && data.gameId === currentGame._id) {
          setCurrentGame((prev) => ({
            ...prev,
            players: prev.players.filter((p) => p._id !== data.playerId),
          }));
        }
      });

      socketInstance.on('gameChatMessage', (data) => {
        if (currentGame && data.gameId === currentGame._id) {
          setGameHistory((prev) => [...prev, data]);
        }
      });

      socketInstance.on('gameAction', (data) => {
        if (currentGame && data.gameId === currentGame._id) {
          // Update game state based on action
          setCurrentGame((prev) => ({
            ...prev,
            ...data.gameState,
          }));
          setGameHistory((prev) => [...prev, data]);
        }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, currentGame]);

  // Fetch all games
  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const gamesData = await gameService.getAllGames();
      setGames(gamesData);
      return gamesData;
    } catch (error) {
      setError(error.message || 'Failed to fetch games');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch a game by ID
  const fetchGameById = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      const gameData = await gameService.getGameById(gameId);
      setCurrentGame(gameData);
      return gameData;
    } catch (error) {
      setError(error.message || 'Failed to fetch game');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create a new game
  const createGame = async (gameData) => {
    setLoading(true);
    setError(null);
    try {
      const newGame = await gameService.createGame(gameData);
      setGames((prev) => [...prev, newGame]);
      return newGame;
    } catch (error) {
      setError(error.message || 'Failed to create game');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Join a game
  const joinGame = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      const game = await gameService.joinGame(gameId);
      setCurrentGame(game);
      socketService.joinGame(gameId);
      return game;
    } catch (error) {
      setError(error.message || 'Failed to join game');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Start a game
  const startGame = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      const game = await gameService.startGame(gameId);
      setCurrentGame(game);
      return game;
    } catch (error) {
      setError(error.message || 'Failed to start game');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Move a player
  const movePlayer = async (gameId, moveData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameService.movePlayer(gameId, moveData);
      return result;
    } catch (error) {
      setError(error.message || 'Failed to move player');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Shoot a player
  const shootPlayer = async (gameId, shootData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameService.shootPlayer(gameId, shootData);
      return result;
    } catch (error) {
      setError(error.message || 'Failed to shoot player');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Upgrade player range
  const upgradeRange = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameService.upgradeRange(gameId);
      return result;
    } catch (error) {
      setError(error.message || 'Failed to upgrade range');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Trade action points
  const tradeActionPoints = async (gameId, tradeData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameService.tradeActionPoints(gameId, tradeData);
      return result;
    } catch (error) {
      setError(error.message || 'Failed to trade action points');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch game history
  const fetchGameHistory = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      const history = await gameService.getGameHistory(gameId);
      setGameHistory(history);
      return history;
    } catch (error) {
      setError(error.message || 'Failed to fetch game history');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send a chat message
  const sendChatMessage = (gameId, message) => {
    socketService.sendChatMessage(gameId, message);
  };

  // Leave current game
  const leaveCurrentGame = () => {
    if (currentGame) {
      socketService.leaveGame(currentGame._id);
      setCurrentGame(null);
      setGameHistory([]);
    }
  };

  const value = {
    games,
    currentGame,
    gameHistory,
    loading,
    error,
    fetchGames,
    fetchGameById,
    createGame,
    joinGame,
    startGame,
    movePlayer,
    shootPlayer,
    upgradeRange,
    tradeActionPoints,
    fetchGameHistory,
    sendChatMessage,
    leaveCurrentGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}; 