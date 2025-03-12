# Tank Turn Tactics - Server

This is the server component of the Tank Turn Tactics game, a real-time multiplayer strategy game.

## Features

- User authentication and management
- Game creation and management
- Real-time gameplay with Socket.io
- Upstash Redis Cloud for serverless data storage with fast access and low latency
- RESTful API for game and user operations

## Tech Stack

- Node.js with Express
- Upstash Redis Cloud for serverless data storage
- Socket.io for real-time communication
- JWT for authentication
- Winston for logging

## Prerequisites

- Node.js (v14 or higher)
- Upstash Redis Cloud account (https://upstash.com/)

## Setting Up Upstash Redis

1. Create an account on [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Get your Redis connection string from the Upstash console
4. Add the connection string to your `.env` file as `UPSTASH_REDIS_URL`

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tank-turn-tactics.git
   cd tank-turn-tactics/server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   UPSTASH_REDIS_URL=redis://default:your_password_here@your-endpoint.upstash.io:6379
   JWT_SECRET=your_jwt_secret_key_change_in_production
   JWT_EXPIRY=7d
   JWT_EXPIRY_SECONDS=604800
   ```

## Running the Server

### Development Mode

```
npm run dev
```

This will start the server with nodemon, which will automatically restart the server when changes are detected.

### Production Mode

```
npm start
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/logout` - Logout a user
- `GET /api/auth/me` - Get current user profile

### Game Endpoints

- `POST /api/games` - Create a new game
- `GET /api/games` - Get all games
- `GET /api/games/:id` - Get a game by ID
- `POST /api/games/:id/join` - Join a game
- `POST /api/games/:id/start` - Start a game
- `POST /api/games/:id/end` - End a game
- `POST /api/games/:id/chat` - Add a chat message to a game

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user stats
- `GET /api/users/games` - Get user games
- `GET /api/users/top` - Get top users

## Socket.io Events

### Client to Server

- `joinGame` - Join a game room
- `leaveGame` - Leave a game room
- `gameChatMessage` - Send a chat message
- `gameAction` - Perform a game action
- `subscribeToGame` - Subscribe to game updates
- `unsubscribeFromGame` - Unsubscribe from game updates

### Server to Client

- `playerJoined` - A player joined the game
- `playerLeft` - A player left the game
- `gameChatMessage` - Receive a chat message
- `gameAction` - Receive a game action
- `gameUpdate` - Receive a game update
- `error` - Error message

## Redis Data Structure

The application uses Upstash Redis Cloud for data storage with the following key patterns:

- `user:{id}` - User data
- `user:email:{email}` - User ID by email
- `user:username:{username}` - User ID by username
- `users` - Set of all user IDs
- `game:{id}` - Game data
- `games` - Set of all game IDs
- `token:{token}` - User ID associated with token
- `token:blacklist:{token}` - Blacklisted tokens
- `user:{id}:tokens` - Set of tokens for a user
- `game:{id}:updates` - Channel for game updates

## Benefits of Using Upstash Redis Cloud

- **Serverless**: No need to manage Redis servers
- **Pay-per-use**: Only pay for what you use
- **Global Replication**: Low latency access from anywhere
- **REST API**: Access Redis from any language
- **High Availability**: Built-in redundancy and failover
- **Scalability**: Automatically scales with your workload

## License

This project is licensed under the MIT License. 