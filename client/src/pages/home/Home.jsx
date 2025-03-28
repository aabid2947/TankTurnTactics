
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import GameCard from "../cards/GameCard";
// import WaitingRoom from "../game/WaitingRoom";

// const HomePage = () => {
//   const navigate = useNavigate();
//   const [modal, setModal] = useState(null);
//   const [gameId, setGameId] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [gameStarted, setGameStarted] = useState(false);
//   const [isJoined, setIsJoined] = useState(false); // Track if a player has joined

//   const handleStartGame = async (useCustomId = false) => {
//     setLoading(true);
//     try {
//       if (useCustomId) {
//         setGameId("TEST123"); // Custom game ID for testing
//       } else {
//         const response = await fetch("/api/create-game"); // Replace with actual backend API
//         const data = await response.json();
//         setGameId(data.gameId);
//       }
//       setModal("start");
//     } catch (error) {
//       console.error("Error creating game:", error);
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
//       {/* Show Home Page & Buttons first */}
//       {!isJoined && (
//         <>
//           <h1 className="text-3xl font-bold">Welcome to Tank Turn Tactics!</h1>

//           <button
//             onClick={() => handleStartGame()}
//             className="mt-4 bg-green-500 p-2 rounded cursor-pointer"
//             disabled={loading}
//           >
//             {loading ? "Creating..." : "Start (API)"}
//           </button>

//           <button
//             onClick={() => handleStartGame(true)}
//             className="mt-4 bg-blue-500 p-2 rounded cursor-pointer"
//             disabled={loading}
//           >
//             Start (Custom ID)
//           </button>

//           <button
//             onClick={() => setModal("join")}
//             className="mt-4 bg-green-500 p-2 rounded cursor-pointer"
//           >
//             Join
//           </button>

//           <button
//             onClick={() => navigate("/login")}
//             className="mt-4 bg-red-500 p-2 rounded cursor-pointer"
//           >
//             Logout
//           </button>

//           {modal && (
//             <GameCard
//               modal={modal}
//               setModal={setModal}
//               gameId={gameId}
//               setGameStarted={setGameStarted}
//               setIsJoined={setIsJoined} // Track when a player joins
//             />
//           )}
//         </>
//       )}

//       {/* Show Waiting Room after a player joins */}
//       {isJoined && !gameStarted && <WaitingRoom gameId={gameId} setGameStarted={setGameStarted} />}

//       {/* Show when the game starts */}
//       {gameStarted && <h1 className="text-3xl font-bold">Game Started!</h1>}
//     </div>
//   );
// };

// export default HomePage;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../cards/GameCard";
import WaitingRoom from "../game/WaitingRoom";
import { useGame } from "../../context/GameContext"
import { useAuth } from "../../context/AuthContext";

const HomePage = () => {
  const { createGame, currentGame } = useGame();
  const {logout} = useAuth()
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isJoined, setIsJoined] = useState(false); // Track if a player has joined


  useEffect(()=>{
    if(currentGame){
      navigate("/lobby")
    }
  },[]);

  const habdleCreateGame = async (useCustomId = false) => {

    setLoading(true);
    try {
      
      const gameData = {
        "name":"game",
        "maxPlayers":5

      }
      // Call context function to create game
      const response = await createGame(gameData);

      if (response.error) {
        console.error("Error creating game:", response.error);
        return;
      }

      console.log(currentGame)


      setModal("start");

      navigate("/lobby"); // Redirect to the lobby
    } catch (error) {
      console.error("Error creating game:", error);
    }

    setLoading(false);
  };

  // Navigate to game page when game starts
  useEffect(() => {
    if (gameStarted) {
      navigate("/main"); // Redirect to the game page
    }
  }, [gameStarted, navigate]);

  const handleLogout = async ()=>{
    try {
      await logout()
    } catch (error) {
      console.log("error in loggin out",error)
      
    }
  }
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      {/* Show Home Page & Buttons first */}
      {!isJoined && (
        <>
          <h1 className="text-3xl font-bold">Welcome to Tank Turn Tactics!</h1>

          <button
            onClick={() => habdleCreateGame()}
            className="mt-4 bg-green-500 p-2 rounded cursor-pointer"
            disabled={loading}
          >
            {loading ? "Creating..." : "Start (API)"}
          </button>



          <button
            onClick={() => setModal("join")}
            className="mt-4 bg-green-500 p-2 rounded cursor-pointer"
          >
            Join
          </button>

          <button
            onClick={handleLogout}
            className="mt-4 bg-red-500 p-2 rounded cursor-pointer"
          >
            Logout
          </button>

          {modal && (
            <GameCard
              modal={modal}
              setModal={setModal}
              gameId={gameId}
              setGameStarted={setGameStarted}
              setIsJoined={setIsJoined} // Track when a player joins
            />
          )}
        </>
      )}

      {/* Show Waiting Room after a player joins */}
      {isJoined && !gameStarted && <WaitingRoom gameId={gameId} setGameStarted={setGameStarted} />}
    </div>
  );
};

export default HomePage;
