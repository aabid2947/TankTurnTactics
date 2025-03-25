import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import chatSocketService from '../../services/chatSocketService';

// Keep the original dummy players array as fallback
const dummyPlayers = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    profilePic: `https://randomuser.me/api/portraits/men/${i + 1}.jpg`,
}));
  
const ChatList = ({ onSelectChat }) => {
  const { currentGame } = useGame();
  const [gamePlayers, setGamePlayers] = useState([]);

  useEffect(() => {
    // If there's a current game, extract players for chat
    if (currentGame && currentGame.data && currentGame.data.players) {
      const currentUserId = localStorage.getItem('userId');
      const otherPlayers = currentGame.data.players
        .filter(player => player.userId !== currentUserId)
        .map(player => ({
          id: player.userId,
          name: player.username,
          profilePic: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 100)}.jpg`,
        }));
      setGamePlayers(otherPlayers);
    }
  }, [currentGame]);

  const handlePlayerClick = (player) => {
    // Start a private chat with the selected player
    chatSocketService.startPrivateChat(player.id);
    // Create a unique roomId for the private chat
    const currentUserId = localStorage.getItem('userId');
    const roomId = `private:${[currentUserId, player.id].sort().join(':')}`;
    chatSocketService.joinChatRoom(roomId);
    onSelectChat(player.name);
  };

  return (
    <div className="bg-gray-800 w-64 h-screen p-4 flex flex-col">
      {/* Group Chat */}
      <button
        className="p-3 text-white text-lg font-bold bg-blue-400 mb-4 cursor-pointer rounded-lg"
        onClick={() => {
          // Join the game chat room if in a game
          if (currentGame && currentGame.data) {
            const gameRoomId = `game:${currentGame.data.gameId}`;
            chatSocketService.joinChatRoom(gameRoomId);
          }
          onSelectChat("global");
        }}
      >
        Group Chat
      </button>

      {/* Scrollable Players List */}
      <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 80px)" }}>
        {/* Display players from current game if available, otherwise fallback to dummy players */}
        {(gamePlayers.length > 0 ? gamePlayers : dummyPlayers).map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-700"
            onClick={() => handlePlayerClick(player)}
          >
            {/* Profile Picture */}
            <img
              src={player.profilePic}
              alt={player.name}
              className="w-12 h-12 rounded-full border-2 border-gray-500"
            />
            
            {/* Player Name */}
            <span className="text-white font-medium">{player.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
  
  