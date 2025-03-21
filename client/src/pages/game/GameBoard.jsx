import React, { useState, useEffect } from "react";
import { useGame } from "../../context/GameContext";

const GRID_SIZE = 20;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const GameBoard = () => {
  const [markerPositions, setMarkerPositions] = useState([]);
  const { currentGame } = useGame();

  useEffect(() => {
    if (!currentGame || !currentGame.data || !currentGame.data.board) return;

    console.log("Board Data:", currentGame.data.board);

    // If board is a 2D array, flatten it; otherwise, use it directly.
    const flatBoard = Array.isArray(currentGame.data.board[0])
      ? currentGame.data.board.flat()
      : currentGame.data.board;

    // Extract only player positions and assign marker objects
    const markers = flatBoard
      .filter(cell => cell.type === "player")
      .map(cell => {
        console.log(`Player at: x=${cell.x}, y=${cell.y}`); // Debugging
        return {
          x: cell.x,
          y: cell.y,
          // Compute a unique index for the cell in a flat grid.
          position: cell.y * GRID_SIZE + cell.x,
        };
      });

    setMarkerPositions(markers);
  }, [currentGame]);

  // Extract marker indices (an array of numbers) from the marker objects
  const markerIndices = markerPositions.map(marker => marker.position);

  return (
    <div className="flex-grow flex flex-row items-center justify-center">
      {/* Scrollable Container */}
      <div className="w-[800px] h-[600px] overflow-auto border border-gray-400 rounded-lg p-2">
        {/* 20x20 Grid */}
        <div className="grid grid-cols-20 grid-rows-20 gap-1 w-max">
          {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
            <div
              key={i}
              className={`w-20 h-20 border border-gray-300 flex items-center justify-center ${
                markerIndices.includes(i) ? "relative" : ""
              }`}
            >
              {markerIndices.includes(i) && (
                <div className="w-10 h-10 bg-blue-100 border-4 border-blue-400 rounded-full flex items-center justify-center">
                  {/* You can add any marker content here */}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
