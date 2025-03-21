
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatList from "./ChatList";
import ChatBox from "./ChatBox";
import GameBoard from "./GameBoard";
import { useGame } from "../../context/GameContext";

const MainPage = () => {
  const [selectedChat, setSelectedChat] = useState(null); // Track selected chat
  const {currentGame} = useGame()

  useEffect(()=>{
    console.log(currentGame['data'])
  },[])
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Grid Section */}
      <div className="mx-8 my-2 flex-grow flex flex-row items-center justify-center p-4">

        <GameBoard/>

        {/* movements, shooting, upgrading range, and trading actions. */}
        <div className="mx-2 mt-4 flex flex-col">
          <button className="bg-blue-400 text-white px-4 py-2 m-1 rounded">Move</button>
          <button className="bg-blue-400 text-white px-4 py-2 m-1 rounded">Shoot</button>
          <button className="bg-blue-400 text-white px-4 py-2 m-1 rounded">Upgrade</button>
          <button className="bg-blue-400 text-white px-4 py-2 m-1 rounded">Trade</button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-80 h-screen flex flex-col">
        {selectedChat ? (
          <ChatBox chatId={selectedChat}  onBack={() => setSelectedChat(null)} />
        ) : (
          <ChatList onSelectChat={setSelectedChat} />
        )}
      </div>
      
    </div>
  );
};

export default MainPage;


