
const players = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    profilePic: `https://randomuser.me/api/portraits/men/${i + 1}.jpg`,
  }));
  
  const ChatList = ({ onSelectChat }) => {
    return (
      <div className="bg-gray-800 w-64 h-screen p-4 flex flex-col">
        {/* Group Chat */}
        <button
          className="p-3 text-white text-lg font-bold bg-blue-400 mb-4 cursor-pointer rounded-lg"
          onClick={() => onSelectChat("global")}
        >
          Group Chat
        </button>
  
        {/* Scrollable Players List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 80px)" }}>
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-700"
              onClick={() => onSelectChat(player.name)}
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
  
  