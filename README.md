# Tank Turn Tactics

A real-time, multiplayer turn-based strategy game where players compete on a dynamic 20x20 grid.

## Project Overview

Tank Turn Tactics is a strategic game where players control tanks on a grid-based battlefield. Players accumulate action points over time, which they can use to move, shoot, upgrade their range, or trade with other players. The game features a shrinking battlefield, adding an element of urgency as the match progresses.

## Features

- **User Authentication**: Register, login, and manage user profiles
- **Game Creation and Management**: Create, join, and start games
- **Real-time Gameplay**: Move, shoot, upgrade range, and trade action points
- **Chat System**: Global and private messaging between players
- **Game History**: Track actions and chat messages during gameplay
- **Dynamic Board**: Battlefield shrinks over time, forcing players to confront each other

## Tech Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.io for real-time communication
- Redis for caching
- JWT for authentication
- Winston for logging

### Frontend (Not Implemented Yet)
- React with Vite
- TailwindCSS
- Context API for state management

## Project Structure

```
tank-turn-tactics/
├── client/                # React frontend (initialized with Vite)
└── server/                # Node.js backend
    ├── src/
    │   ├── config/        # Configuration files
    │   ├── controllers/   # Route controllers
    │   ├── middleware/    # Express middleware
    │   ├── models/        # Mongoose models
    │   ├── routes/        # Express routes
    │   ├── services/      # Business logic
    │   ├── socket/        # Socket.io handlers
    │   ├── utils/         # Utility functions
    │   └── index.js       # Entry point
    ├── .env               # Environment variables
    └── package.json       # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tank-turn-tactics.git
   cd tank-turn-tactics
   ```

2. Install server dependencies:
   ```
   cd server
   npm install
   ```

3. Install client dependencies:
   ```
   cd ../client
   npm install
   ```

4. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/tank-turn-tactics
   JWT_SECRET=your_jwt_secret_key_change_in_production
   JWT_EXPIRY=7d
   REDIS_URL=redis://localhost:6379
   NODE_ENV=development
   ```

### Running the Application

1. Start MongoDB and Redis

2. Start the server:
   ```
   cd server
   npm run dev
   ```

3. Start the client (when implemented):
   ```
   cd client
   npm run dev
   ```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/logout` - Logout a user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/password` - Update user password

### Game Endpoints

- `POST /api/game` - Create a new game
- `GET /api/game` - Get all games
- `GET /api/game/:id` - Get a game by ID
- `POST /api/game/:id/join` - Join a game
- `POST /api/game/:id/start` - Start a game
- `POST /api/game/:id/move` - Move a player
- `POST /api/game/:id/shoot` - Shoot a player
- `POST /api/game/:id/upgrade` - Upgrade player range
- `POST /api/game/:id/trade` - Trade action points
- `GET /api/game/:id/history` - Get game action history

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `GET /api/users/stats` - Get user stats

## Socket.io Events

### Client to Server

- `joinGame` - Join a game room
- `leaveGame` - Leave a game room
- `gameChatMessage` - Send a chat message
- `gameAction` - Perform a game action

### Server to Client

- `playerJoined` - A player joined the game
- `playerLeft` - A player left the game
- `gameChatMessage` - Receive a chat message
- `gameAction` - Receive a game action
- `error` - Error message

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Inspired by the original Tank Turn Tactics concept
- Built as a learning project for real-time multiplayer game development 