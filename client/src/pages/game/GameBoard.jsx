
import React from "react";

const GameBoard = () => {
  return (
    <div className="flex-grow flex flex-row items-center justify-center ">
      {/* Scrollable Container */}
      <div className="w-[800px] h-[600px] overflow-auto border border-gray-400 rounded-lg p-2">
        {/* 20x20 Grid */}
        <div className="grid grid-cols-20 grid-rows-20 gap-1 w-max">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="w-20 h-20 border border-gray-300"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
