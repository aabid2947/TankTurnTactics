
// const GameCard = ({ modal, setModal, gameId, setGameStarted }) => {
//   const [waiting, setWaiting] = useState(false);

//   const handleJoin = () => {
//     setWaiting(true);
//     setModal(null); // Close the modal
//   };

//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-gray-800 p-6 rounded-lg w-80">
//         {modal === "join" ? (
//           <>
//             <h2 className="text-xl font-bold">Join Game</h2>
//             <input
//               type="text"
//               placeholder="Enter Game ID"
//               className="w-full p-2 mt-2 text-black rounded"
//             />
//             <button
//               onClick={handleJoin}
//               className="mt-4 bg-green-500 p-2 w-full rounded"
//             >
//               Join
//             </button>
//           </>
//         ) : (
//           <>
//             <h2 className="text-xl font-bold">Game Created!</h2>
//             <p className="mt-2">Game ID: {gameId}</p>
//             <button
//               onClick={() => setWaiting(true)}
//               className="mt-4 bg-green-500 p-2 w-full rounded"
//             >
//               Start Game
//             </button>
//           </>
//         )}
//         <button
//           onClick={() => setModal(null)}
//           className="mt-4 bg-gray-600 p-2 w-full rounded"
//         >
//           Close
//         </button>
//       </div>
//     </div>
//   );
// };

// export default GameCard;
import { useState } from "react";
import { useGame } from "../../context/GameContext";
import { useNavigate } from "react-router-dom";

const GameCard = ({ modal, setModal, gameId, setGameStarted, setIsJoined }) => {
  const [gameIdInput, setGameIdInput] = useState("");
  const {joinGame}  = useGame()
  const navigate = useNavigate()

  const handleJoin =async () => {
    try {

      const response = await joinGame(gameIdInput)
     
      if(response.error){
        console.log("Error joining game ")
      }

      navigate("/lobby")
      setIsJoined(true); // Move to waiting list
      setModal(null); // Close the modal
    } catch (error) {
      console.error("Failed to join the game:", error);
    }

    
  };

  const handleStartGame = () => {
    setIsJoined(true); // Move to waiting list
    setModal(null); // Close modal
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80">
        {modal === "join" ? (
          <>
            <h2 className="text-xl font-bold">Join Game</h2>
            <input
              type="text"
              placeholder="Enter Game ID"
              className="w-full p-2 mt-2 text-black rounded"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="mt-4 bg-green-500 p-2 w-full rounded"
            >
              Join
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold">Game Created!</h2>
            <p className="mt-2">Game ID: {gameId}</p>
            <button
              onClick={handleStartGame}
              className="mt-4 bg-green-500 p-2 w-full rounded"
            >
              Start Game
            </button>
          </>
        )}
        <button
          onClick={() => setModal(null)}
          className="mt-4 bg-gray-600 p-2 w-full rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GameCard;
