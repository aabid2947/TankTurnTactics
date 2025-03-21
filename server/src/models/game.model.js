// import mongoose from 'mongoose';

// // Define the player schema
// const playerSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   position: {
//     x: {
//       type: Number,
//       required: true
//     },
//     y: {
//       type: Number,
//       required: true
//     }
//   },
//   health: {
//     type: Number,
//     default: 100,
//     min: 0,
//     max: 100
//   },
//   actionPoints: {
//     type: Number,
//     default: 0
//   },
//   range: {
//     type: Number,
//     default: 3,
//     min: 1
//   },
//   isAlive: {
//     type: Boolean,
//     default: true
//   },
//   kills: {
//     type: Number,
//     default: 0
//   },
//   deaths: {
//     type: Number,
//     default: 0
//   },
//   lastAction: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Define the chat message schema
// const chatMessageSchema = new mongoose.Schema({
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   recipient: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   content: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   isGlobal: {
//     type: Boolean,
//     default: false
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Define the game action schema
// const gameActionSchema = new mongoose.Schema({
//   player: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   actionType: {
//     type: String,
//     enum: ['move', 'shoot', 'upgrade', 'trade', 'revive'],
//     required: true
//   },
//   details: {
//     from: {
//       x: Number,
//       y: Number
//     },
//     to: {
//       x: Number,
//       y: Number
//     },
//     target: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     amount: Number
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Define the main game schema
// const gameSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   status: {
//     type: String,
//     enum: ['waiting', 'active', 'completed'],
//     default: 'waiting'
//   },
//   boardSize: {
//     width: {
//       type: Number,
//       default: 20
//     },
//     height: {
//       type: Number,
//       default: 20
//     }
//   },
//   currentBoardSize: {
//     width: {
//       type: Number,
//       default: 20
//     },
//     height: {
//       type: Number,
//       default: 20
//     }
//   },
//   players: [playerSchema],
//   maxPlayers: {
//     type: Number,
//     default: 10,
//     min: 2,
//     max: 20
//   },
//   actionHistory: [gameActionSchema],
//   chatHistory: [chatMessageSchema],
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   winner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   startedAt: {
//     type: Date
//   },
//   endedAt: {
//     type: Date
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   lastActionAt: {
//     type: Date,
//     default: Date.now
//   },
//   settings: {
//     apPerTurn: {
//       type: Number,
//       default: 1
//     },
//     apCostMove: {
//       type: Number,
//       default: 1
//     },
//     apCostShoot: {
//       type: Number,
//       default: 1
//     },
//     apCostUpgrade: {
//       type: Number,
//       default: 3
//     },
//     damagePerShot: {
//       type: Number,
//       default: 25
//     },
//     boardShrinkInterval: {
//       type: Number,
//       default: 10 // in minutes
//     },
//     turnDuration: {
//       type: Number,
//       default: 60 // in seconds
//     }
//   }
// }, {
//   timestamps: true
// });

// // Method to check if a player can perform an action
// gameSchema.methods.canPerformAction = function(playerId, actionType) {
//   try {
//     const player = this.players.find(p => p.user.toString() === playerId.toString());
    
//     if (!player || !player.isAlive) {
//       return false;
//     }
    
//     const apCost = this.settings[`apCost${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`];
//     return player.actionPoints >= apCost;
//   } catch (error) {
//     console.error(`Error in canPerformAction: ${error.message}`);
//     return false;
//   }
// };

// // Method to get active players
// gameSchema.methods.getActivePlayers = function() {
//   try {
//     return this.players.filter(player => player.isAlive);
//   } catch (error) {
//     console.error(`Error in getActivePlayers: ${error.message}`);
//     return [];
//   }
// };

// // Method to check if game is over
// gameSchema.methods.isGameOver = function() {
//   try {
//     const activePlayers = this.getActivePlayers();
//     return activePlayers.length <= 1;
//   } catch (error) {
//     console.error(`Error in isGameOver: ${error.message}`);
//     return false;
//   }
// };

// // Method to determine winner
// gameSchema.methods.determineWinner = function() {
//   try {
//     const activePlayers = this.getActivePlayers();
//     return activePlayers.length === 1 ? activePlayers[0].user : null;
//   } catch (error) {
//     console.error(`Error in determineWinner: ${error.message}`);
//     return null;
//   }
// };

// // Method to check if a position is within the current board boundaries
// gameSchema.methods.isPositionValid = function(x, y) {
//   try {
//     return x >= 0 && 
//            y >= 0 && 
//            x < this.currentBoardSize.width && 
//            y < this.currentBoardSize.height;
//   } catch (error) {
//     console.error(`Error in isPositionValid: ${error.message}`);
//     return false;
//   }
// };

// // Method to check if a position is occupied by another player
// gameSchema.methods.isPositionOccupied = function(x, y, excludePlayerId = null) {
//   try {
//     return this.players.some(player => 
//       player.isAlive && 
//       player.position.x === x && 
//       player.position.y === y &&
//       (!excludePlayerId || player.user.toString() !== excludePlayerId.toString())
//     );
//   } catch (error) {
//     console.error(`Error in isPositionOccupied: ${error.message}`);
//     return true; // Safer to assume occupied if there's an error
//   }
// };

// // Method to calculate distance between two positions
// gameSchema.methods.calculateDistance = function(x1, y1, x2, y2) {
//   try {
//     // Manhattan distance for grid-based movement
//     return Math.abs(x1 - x2) + Math.abs(y1 - y2);
//   } catch (error) {
//     console.error(`Error in calculateDistance: ${error.message}`);
//     return Infinity; // Return a large value on error
//   }
// };

// const Game = mongoose.model('Game', gameSchema);

// export default Game; 