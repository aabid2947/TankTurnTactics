import { io } from 'socket.io-client';

let socket;

const socketService = {
  // Initialize socket connection
  initSocket: () => {
    console.log('Initializing socket connection');
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

    socket.on('playerJoined',(data)=>{
      console.log('A new player has joined:', data);
    })



    socket.on('playerLeft',(data)=>{
      console.log('A  player has leaved the game:', data);
    })

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
    socket.emit('joinGame', gameId );
  },

   // Join a game room
   startGame: (gameId) => {
    console.log(gameId)
    if (!socket) socketService.initSocket();
    socket.emit('startGame', {gameId} );
  },

  // Leave a game room
  leaveGame: (gameId) => {
    if (!socket) return;
    socket.emit('leaveGame', { gameId });
  },

  // Action:Move
  movePlayer: (gameId,moveData) => {
    if (!socket) return;
    socket.emit('movePlayer', { gameId,moveData });
  },

   // Action:Shoot
   shootPlayer: (gameId,shootData) => {
    if (!socket) return;
    socket.emit('shootPlayer', { gameId,shootData });
  },

  // Action:Transfer AP
  transferActionPoint: (gameId,transferData) => {
    if (!socket) return;
    socket.emit('transferAP', { gameId,transferData });
  },

  // Action:increase Range
  increaseRange: (gameId) => {
    if (!socket) return;
    socket.emit('increaseRange', { gameId });
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