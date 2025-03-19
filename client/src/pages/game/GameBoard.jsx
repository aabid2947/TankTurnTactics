// import React, { useState, useEffect } from "react";

// const GRID_SIZE = 20;
// const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
// const MARKER_COUNT = 17;

// const getRandomPositions = () => {
//   const positions = new Set();
//   while (positions.size < MARKER_COUNT) {
//     positions.add(Math.floor(Math.random() * TOTAL_CELLS));
//   }
//   return Array.from(positions);
// };

// const GameBoard = () => {
//   const [markerPositions, setMarkerPositions] = useState([]);

//   useEffect(() => {
//     setMarkerPositions(getRandomPositions());
//   }, []);

//   return (
//     <div className="flex-grow flex flex-row items-center justify-center">
//       {/* Scrollable Container */}
//       <div className="w-[800px] h-[600px] overflow-auto border border-gray-400 rounded-lg p-2">
//         {/* 20x20 Grid */}
//         <div className="grid grid-cols-20 grid-rows-20 gap-1 w-max">
//           {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
//             <div
//               key={i}
//               className={`w-20 h-20 border border-gray-300 flex items-center justify-center ${
//                 markerPositions.includes(i) ? "relative" : ""
//               }`}
//             >
//               {markerPositions.includes(i) && (
//                 <div className="w-10 h-10 bg-blue-100 border-4 border-blue-400 rounded-full flex items-center justify-center">
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GameBoard;

import React, { useState, useEffect } from "react";

const GRID_SIZE = 20;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Given 2D grid data
const GRID_DATA = [
  { "type": "marker", "x": 0, "y": 0 },
  { "type": "marker", "x": 1, "y": 0 },
  { "type": "marker", "x": 2, "y": 0 },
  { "type": "marker", "x": 3, "y": 0 },
  { "type": "marker", "x": 4, "y": 0 },
  { "type": "marker", "x": 5, "y": 0 },
  { "type": "marker", "x": 6, "y": 0 },
  { "type": "marker", "x": 7, "y": 0 },
  { "type": "marker", "x": 8, "y": 0 },
  { "type": "marker", "x": 9, "y": 0 },
  { "type": "marker", "x": 10, "y": 0 },
  { "type": "marker", "x": 11, "y": 0 },
  { "type": "marker", "x": 12, "y": 0 },
  { "type": "marker", "x": 13, "y": 0 },
  { "type": "marker", "x": 14, "y": 0 },
  { "type": "marker", "x": 15, "y": 0 },
  { "type": "marker", "x": 16, "y": 0 },
  { "type": "empty", "x": 17, "y": 0 },
  { "type": "empty", "x": 18, "y": 0 },
  { "type": "empty", "x": 19, "y": 0 }
];

const GameBoard = () => {
  const [markerPositions, setMarkerPositions] = useState([]);

  useEffect(() => {
    setMarkerPositions(GRID_DATA.filter(cell => cell.type === "marker").map(cell => cell.y * GRID_SIZE + cell.x));
  }, []);

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
                markerPositions.includes(i) ? "relative" : ""
              }`}
            >
              {markerPositions.includes(i) && (
                <div className="w-10 h-10 bg-blue-100 border-4 border-blue-400 rounded-full flex items-center justify-center"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;