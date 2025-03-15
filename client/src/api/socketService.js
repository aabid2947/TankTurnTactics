import { io } from 'socket.io-client';

let socket;

const socketService = {
  // Initialize socket connection
  initSocket: () => {
    socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return socket;
  },

  // Get socket instance
  getSocket: () => {
    if (!socket) {
      return socketService.initSocket();
    }
    return socket;
  },

  // Join a game room
  joinGame: (gameId) => {
    if (!socket) socketService.initSocket();
    socket.emit('joinGame', { gameId });
  },

  // Leave a game room
  leaveGame: (gameId) => {
    if (!socket) return;
    socket.emit('leaveGame', { gameId });
  },

  // Send a chat message
  sendChatMessage: (gameId, message) => {
    if (!socket) socketService.initSocket();
    socket.emit('gameChatMessage', { gameId, message });
  },

  // Perform a game action
  performGameAction: (gameId, action, data) => {
    if (!socket) socketService.initSocket();
    socket.emit('gameAction', { gameId, action, data });
  },

  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
};

export default socketService; 