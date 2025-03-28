import { createContext, useState, useEffect, useContext } from 'react';
import { gameService, socketService } from '../api';
import { useAuth } from './AuthContext';
import chatSocketService from '../services/chatSocketService';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();

  // Load persisted state from sessionStorage
  const loadFromStorage = (key, defaultValue) => {
    const storedValue = sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  };

  const [games, setGames] = useState(() => loadFromStorage('games', []));
  const [currentGame, setCurrentGame] = useState(() => loadFromStorage('currentGame', null));
  const [playerAttributes, setPlyerAttributes] = useState(() => loadFromStorage('playerAttributes', null));

  const [gameHistory, setGameHistory] = useState(() => loadFromStorage('gameHistory', []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  // Save state to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('games', JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    sessionStorage.setItem('currentGame', JSON.stringify(currentGame));
  }, [currentGame]);

  useEffect(() => {
    sessionStorage.setItem('gameHistory', JSON.stringify(gameHistory));
  }, [gameHistory]);

  // Initialize socket when user is authenticated
  useEffect(() => {
    if (currentGame && isAuthenticated) {
      const socketInstance = socketService.getSocket();
      setSocket(socketInstance);

      socketInstance.on('playerJoined', (data) => {
        if (currentGame && data.gameId === currentGame.data.gameId) {
          setCurrentGame((prev) => ({
            ...prev,
            data: {
              ...prev.data,
              players: [...(prev.data.players || []), { userId: data.userId, username: data.username }],
            },
          }));

          // When a new player joins, create a private chat room
          if (data.userId !== localStorage.getItem('userId')) {
            chatSocketService.startPrivateChat(data.userId);
          }
        }
      });

      socketInstance.on('gameStarted', (data) => {
        if (currentGame) {
          setCurrentGame(data);
          // Join the game chat room when game starts
          const gameRoomId = `game:${data.data.gameId}`;
          chatSocketService.joinChatRoom(gameRoomId);
        }
      });

      socketInstance.on('playerMoved', (data) => {
        if (currentGame) {
          setCurrentGame(data);
        }
      });

      socketInstance.on('playerShot', (data) => {
        if (currentGame) {
          setCurrentGame(data);
        }
      });

      socketInstance.on('apTransferred', (data) => {
        if (currentGame) {
          setCurrentGame(data);
        }
      });

      socketInstance.on('rangeIncreased', (data) => {
        if (currentGame) {
          setCurrentGame(data);
        }
      });

      socketInstance.on('playerLeft', (data) => {
        if (currentGame && data.gameId === currentGame['data'].gameId) {
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
          setCurrentGame((prev) => ({
            ...prev,
            ...data.gameState,
          }));
          setGameHistory((prev) => [...prev, data]);
        }
      });
    }
  }, [isAuthenticated, currentGame]);

  // Fetch all games
  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      // Make an Api call to get all games
      const gamesData = await gameService.getAllGames();

      // set games in sesssion storage
      setGames(gamesData);

      // return game data
      return gamesData;

    } catch (error) {
      // set error
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
      const game = await gameService.createGame(gameData);
      setCurrentGame(game);
      // Create a chat room for the game
      const gameRoomId = `game:${game.data.gameId}`;
      await chatSocketService.createChatRoom(gameRoomId);
      return game;
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
      // Join the game chat room
      const gameRoomId = `game:${gameId}`;
       chatSocketService.joinChatRoom(gameRoomId);
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

      socketService.startGame(gameId);
      // Ensure all players are in the game chat room
      const gameRoomId = `game:${gameId}`;
       chatSocketService.joinChatRoom(gameRoomId);
      return game;
    } catch (error) {
      setError(error.message || 'Failed to start game');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Start a game
  const assignPlayerAttributes = async (player) => {
    setLoading(true);
    setError(null);
    try {
      setPlyerAttributes(player)
      return player;
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
      socketService.movePlayer(gameId, moveData);
      return;
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
      socketService.shootPlayer(gameId, shootData);
      return;
    } catch (error) {
      setError(error.message || 'Failed to shoot player');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Upgrade player range
  const increaseRange = async (gameId) => {
    setLoading(true);
    setError(null);
    try {
      socketService.increaseRange(gameId);
      return;
    } catch (error) {
      setError(error.message || 'Failed to upgrade range');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Trade action points
  const transferActionPoints = async (gameId, transferData) => {
    setLoading(true);
    setError(null);
    try {
      socketService.transferActionPoint(gameId, transferData);
      return;
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

  const sendChatMessage = (gameId, message) => {
    socketService.sendChatMessage(gameId, message);
  };

  const leaveCurrentGame = (gameId) => {
    if (currentGame) {
      // remove player data from the game 
      gameService.leaveGame(gameId);
      // Leave the room 
      // Disconnet to socket
      socketService.leaveGame(gameId);
      // Leave the chat room
      const gameRoomId = `game:${gameId}`;
      chatSocketService.leaveChatRoom(gameRoomId);

      // set Current game null
      setCurrentGame(null);
      setGameHistory([]);
    }
  };

  return (
    <GameContext.Provider value={{
      games, currentGame, gameHistory, loading, error, playerAttributes,
      fetchGames, fetchGameById, createGame, joinGame, startGame, assignPlayerAttributes,
      movePlayer, shootPlayer, increaseRange, transferActionPoints,
      fetchGameHistory, sendChatMessage, leaveCurrentGame,
    }}>
      {children}
    </GameContext.Provider>
  );
};
