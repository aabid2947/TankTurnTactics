import { useState, useEffect } from "react";

const WaitingRoom = ({ gameId, setGameStarted }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) => {
        if (prev.length < 17) {
          return [...prev, `Player ${prev.length + 1}`];
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80">
        <h2 className="text-xl font-bold">Waiting for Players...</h2>
        <p className="mt-2">Game ID: {gameId}</p>
        <p className="mt-2">Players Joined: {players.length} / 17</p>
        <ul className="mt-2 max-h-40 overflow-auto">
          {players.map((player, index) => (
            <li key={index} className="text-white">
              {player}
            </li>
          ))}
        </ul>
        {players.length === 17 && (
          <button
            onClick={() => setGameStarted(true)}
            className="mt-4 bg-green-500 p-2 w-full rounded"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
