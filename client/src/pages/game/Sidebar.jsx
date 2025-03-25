import { useState } from "react";
import { useGame } from "../../context/GameContext";
import { useNavigate } from "react-router-dom";
// import { FiMenu, FiSidebar } from "react-icons/fi";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const {leaveCurrentGame,currentGame } = useGame()
  const navigate = useNavigate()

   const handleLeaveGame = () =>{
    console.log(currentGame)
    leaveCurrentGame(currentGame.gameId)
    navigate("/")
   }
  return (
    <div className={`h-screen bg-gray-800 text-white p-4 transition-all ${isOpen ? "w-48" : "w-16"}`}>
      
      {/* Toggle Button */}
      <button
        className="mb-4 p-2 bg-gray-700 rounded-md hover:bg-gray-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* <FiMenu size={24} /> */}
      </button>

      {/* Menu Options */}
      <ul className="space-y-4">
        <li className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
          <img src="/icons/dashboard.png" alt="Dashboard" className="w-6 h-6" />
          {isOpen && <span>Instructions</span>}
        </li>
        <li className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
          <img src="/icons/settings.png" alt="Settings" className="w-6 h-6" />
          {isOpen && <span>Settings</span>}
        </li>
        <li className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
          <img src="/icons/logout.png" alt="Logout" className="w-6 h-6" />
          {isOpen && <span>Logout</span>}
        </li>
        <li className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded" onClick={handleLeaveGame}>
          <img src="/icons/logout.png" alt="Logout" className="w-6 h-6" />
          {isOpen && <span>Leave Game</span>}
        </li>
      </ul>
    </div>
  );
}
