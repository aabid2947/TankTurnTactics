
import React, { useState, useEffect, useMemo, useRef } from "react"
import { useGame } from "../../context/GameContext"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { Compass, ZoomIn, ZoomOut, RefreshCw, Map } from "lucide-react"

const GRID_SIZE = 20
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE

// Define different player types with colors
const PLAYER_TYPES = {
  default: { bg: "bg-blue-400", border: "border-blue-600", shadow: "shadow-blue-300" },
  ally: { bg: "bg-green-400", border: "border-green-600", shadow: "shadow-green-300" },
  enemy: { bg: "bg-red-400", border: "border-red-600", shadow: "shadow-red-300" },
  neutral: { bg: "bg-yellow-400", border: "border-yellow-600", shadow: "shadow-yellow-300" },
}

const GameBoard = () => {
  const [markerPositions, setMarkerPositions] = useState([])
  const [actionOptions, setActionOptions] = useState([]) // positions available for action
  const [selectedAction, setSelectedAction] = useState(null) // 'move', 'attack', 'transfer'
  const [hoveredCell, setHoveredCell] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [showMinimap, setShowMinimap] = useState(false)
  
  const { currentGame, movePlayer, shootPlayer, transferActionPoints, increaseRange } = useGame()
  const { currentPlayer } = useAuth()
  const boardRef = useRef(null)

  // Calculate and update marker positions for players
  useEffect(() => {
    console.log(currentPlayer)
    if (!currentGame || !currentGame.data || !currentGame.data.board) return

    // Flatten board if needed
    const flatBoard = Array.isArray(currentGame.data.board[0])
      ? currentGame.data.board.flat()
      : currentGame.data.board

    // Filter cells where cell.type is an object with role "player"
    const markers = flatBoard
      .filter(cell => typeof cell.type === "object" && cell.type.role === "player")
      .map(cell => ({
          x: cell.x,
          y: cell.y,
          position: cell.y * GRID_SIZE + cell.x,
          userId: cell.type.userId,
          playerType: cell.type.playerType || "default",
          name: cell.type.name || `Player`,
          health: cell.type.heart || 3,
      }))

    setMarkerPositions(markers)
  }, [currentGame])

  // Get my player attributes from the board
  const myPlayerAttributes = useMemo(() => {
    if (!currentGame || !currentGame.data || !currentGame.data.board || !currentPlayer) return null
    const flatBoard = Array.isArray(currentGame.data.board[0])
      ? currentGame.data.board.flat()
      : currentGame.data.board
    const myCell = flatBoard.find(cell =>
      typeof cell.type === "object" &&
      cell.type.role === "player" &&
      cell.type.userId === currentPlayer.data.id
    )
    return myCell ? myCell.type : null
  }, [currentGame, currentPlayer])

  // Compute possible move options based on my player's attributes using Chebyshev distance
  const moveOptions = useMemo(() => {
    if (!myPlayerAttributes || !currentGame || !currentGame.data || !currentGame.data.board) return []
    const flatBoard = Array.isArray(currentGame.data.board[0])
      ? currentGame.data.board.flat()
      : currentGame.data.board
    const myCell = flatBoard.find(cell =>
      typeof cell.type === "object" &&
      cell.type.role === "player" &&
      cell.type.userId === currentPlayer.data.id
    )
    if (!myCell) return []
    const range = myPlayerAttributes.range || 1
    return flatBoard
      .filter(cell => cell.type === "empty")
      .filter(cell => {
        const dx = Math.abs(cell.x - myCell.x)
        const dy = Math.abs(cell.y - myCell.y)
        const distance = Math.max(dx, dy) // Chebyshev distance
        return distance > 0 && distance <= range
      })
      .map(cell => cell.y * GRID_SIZE + cell.x)
  }, [myPlayerAttributes, currentGame, currentPlayer])

  // Compute possible attack options (cells with another player within range)
  const attackOptions = useMemo(() => {
    if (!myPlayerAttributes || !currentGame || !currentGame.data || !currentGame.data.board) return []
    const flatBoard = Array.isArray(currentGame.data.board[0])
      ? currentGame.data.board.flat()
      : currentGame.data.board
    const myCell = flatBoard.find(cell =>
      typeof cell.type === "object" &&
      cell.type.role === "player" &&
      cell.type.userId === currentPlayer.data.id
    )
    if (!myCell) return []
    const range = myPlayerAttributes.range || 1
    return flatBoard
      .filter(cell => typeof cell.type === "object" && cell.type.role === "player" && cell.type.userId !== currentPlayer.data.id)
      .filter(cell => {
        const dx = Math.abs(cell.x - myCell.x)
        const dy = Math.abs(cell.y - myCell.y)
        const distance = Math.max(dx, dy)
        return distance > 0 && distance <= range
      })
      .map(cell => cell.y * GRID_SIZE + cell.x)
  }, [myPlayerAttributes, currentGame, currentPlayer])

  // For transfer, we reuse attackOptions (i.e. transfer to a player within range)
  const transferOptions = attackOptions;

  // When user selects an action, update the action options accordingly
  useEffect(() => {
    if (selectedAction === "move") {
      setActionOptions(moveOptions)
    } else if (selectedAction === "attack") {
      setActionOptions(attackOptions)
    } else if (selectedAction === "transfer") {
      setActionOptions(transferOptions)
    } else {
      setActionOptions([])
    }
  }, [selectedAction, moveOptions, attackOptions, transferOptions])

  // Extract marker indices for players from markerPositions
  const markerIndices = markerPositions.map(marker => marker.position)

  // Get marker at a specific position
  const getMarkerAtPosition = (position) => {
    return markerPositions.find(marker => marker.position === position)
  }

  // Handle cell click based on selected action
  const handleCellClick = (index) => {
    if (actionOptions.includes(index)) {
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);

      if (selectedAction === "move" && currentGame) {
        movePlayer(currentGame.gameId, { newX: x, newY: y })
          .then(updatedGame => {
            console.log("Move executed successfully:", updatedGame)
          })
          .catch(error => {
            console.error("Move action failed:", error)
          })
      } else if (selectedAction === "attack" && currentGame) {
        shootPlayer(currentGame.gameId, { targetX: x, targetY: y })
          .then(updatedGame => {
            console.log("Attack executed successfully:", updatedGame)
          })
          .catch(error => {
            console.error("Attack action failed:", error)
          })
      } else if (selectedAction === "transfer" && currentGame) {
        // Create transfer data with target coordinates
        const transferData = { targetX: x, targetY: y }
        transferActionPoints(currentGame.gameId, transferData)
          .then(updatedGame => {
            console.log("AP transferred successfully:", updatedGame);
          })
          .catch(error => {
            console.error("Transfer action failed:", error);
          });
      }
      // Reset action options
      setSelectedAction(null);
      setActionOptions([]);
    } else {
      setSelectedCell(index);
    }
  }

  // Determine background for action options based on selected action
  const getOptionBg = (index) => {
    if (!actionOptions.includes(index)) return "";
    if (selectedAction === "move") return "bg-green-100";
    if (selectedAction === "attack") return "bg-red-100";
    if (selectedAction === "transfer") return "bg-purple-100";
    return "";
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 rounded-xl">
      {/* Action Selection Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={() => setSelectedAction("move")}
          className={`px-4 py-2 rounded-md ${selectedAction === "move" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Move
        </button>
        <button
          onClick={() => setSelectedAction("attack")}
          className={`px-4 py-2 rounded-md ${selectedAction === "attack" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Attack
        </button>
        <button
          onClick={() => setSelectedAction("transfer")}
          className={`px-4 py-2 rounded-md ${selectedAction === "transfer" ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Transfer AP
        </button>
        <button
          onClick={() => {
            if (currentGame) {
              increaseRange(currentGame.gameId)
                .then(updatedGame => console.log("Range increased:", updatedGame))
                .catch(error => console.error("Increase range failed:", error));
            }
          }}
          className="px-4 py-2 rounded-md bg-yellow-500 text-white"
        >
          Increase Range
        </button>
      </div>

      {/* Display My Player Attributes */}
      {myPlayerAttributes && (
        <div className="mb-4 p-2 bg-white dark:bg-gray-800 rounded shadow border border-gray-300 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white mb-1">My Attributes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">AP: {myPlayerAttributes.ap}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Heart: {myPlayerAttributes.heart}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Range: {myPlayerAttributes.range}</p>
        </div>
      )}

      {/* Scrollable Container */}
      <div className="w-[800px] h-[600px] overflow-auto border border-gray-400 rounded-lg p-2 relative">
        {/* 20x20 Grid */}
        <div className="grid grid-cols-20 grid-rows-20 gap-1 w-max">
          {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
            const hasMarker = markerIndices.includes(i);
            const optionAvailable = actionOptions.includes(i);
            const marker = hasMarker ? getMarkerAtPosition(i) : null;
            return (
              <div
                key={i}
                className={`w-20 h-20 border border-gray-300 flex items-center justify-center relative cursor-pointer ${getOptionBg(i)}`}
                onClick={() => handleCellClick(i)}
              >
                {hasMarker && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    className={`w-12 h-12 ${PLAYER_TYPES[marker.playerType].bg} ${PLAYER_TYPES[marker.playerType].border} border-4 rounded-full flex items-center justify-center shadow-lg ${PLAYER_TYPES[marker.playerType].shadow} z-10`}
                  >
                    <span className="text-white font-bold text-sm">
                      {marker.name.substring(0, 2)}
                    </span>
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mini Map */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-4 w-32 h-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 overflow-hidden p-1"
          >
            <div className="w-full h-full bg-gray-100 dark:bg-gray-900 relative">
              {markerPositions.map((marker, idx) => (
                <div
                  key={idx}
                  className={`absolute w-2 h-2 rounded-full ${PLAYER_TYPES[marker.playerType].bg}`}
                  style={{
                    left: `${(marker.x / GRID_SIZE) * 100}%`,
                    top: `${(marker.y / GRID_SIZE) * 100}%`,
                  }}
                ></div>
              ))}
              {/* Viewport indicator */}
              <div
                className="absolute border-2 border-indigo-500 opacity-70 pointer-events-none"
                style={{
                  left: "25%",
                  top: "25%",
                  width: "50%",
                  height: "50%",
                }}
              ></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Info Panel */}
      <AnimatePresence>
        {selectedCell !== null && markerIndices.includes(selectedCell) && selectedAction !== "attack" && selectedAction !== "transfer" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700"
          >
            {(() => {
              const marker = getMarkerAtPosition(selectedCell);
              const playerStyle = PLAYER_TYPES[marker.playerType];
              return (
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${playerStyle.bg} ${playerStyle.border} border-2 rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold">{marker.name.substring(0, 2)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{marker.name}</h3>
                    <div className="flex items-center mt-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full" 
                          style={{ width: `${marker.health}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">{marker.health}%</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Position: ({marker.x}, {marker.y})
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GameBoard;
