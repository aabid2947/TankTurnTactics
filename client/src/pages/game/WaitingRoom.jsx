import { useState, useEffect } from "react";
import { useGame } from "../../context/GameContext";
import { useNavigate } from "react-router-dom";

const WaitingRoom = ({ gameId, setGameStarted }) => {
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate()
  const { currentGame, leaveCurrentGame, startGame } = useGame()


  useEffect(() => {
    if (!currentGame) {
      navigate("/")
    }
    else{

      if(currentGame['data'].status == 'active'){
        navigate("/main")
      }
    }

  },[currentGame])
  
  const handleLeaveGame = async () => {
    try {
      console.log("leave")
      await leaveCurrentGame()
      navigate("/")
    } catch (error) {
      console.log("error leaving room:", error)
    }
  }

  const handleGameStart = async()=>{
    try {
      const game = await startGame(currentGame['data'].gameId)

      if(!game){
        console.log("game not started")
      }

      navigate("/main")
      return game 
    } catch (error) {
      console.log("error in starting the game :", error)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80">
        <h2 className="text-xl font-bold">Waiting for Players...</h2>
        {currentGame ?
          <div>
            <p className="mt-2">Game ID: {currentGame['data'].gameId}</p>
            <p className="mt-2">Players Joined: {currentGame['data'].players.length} / {currentGame['data'].maxPlayers}</p>
          </div> :
          <></>}

        <ul className="mt-2 max-h-40 overflow-auto">
          {players.map((player, index) => (
            <li key={index} className="text-white">
              {player}
            </li>
          ))}
        </ul>
      
          <button
            onClick={handleGameStart}
            className="mt-4 bg-green-500 p-2 w-full rounded"
          >
            Start Game
          </button>
        

        <button
          onClick={handleLeaveGame}
          className="mt-4 bg-green-500 p-2 w-full rounded"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
