import React, { useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { useGame } from '../../context';

export const Game = () => {
  // Protect this route
  // const { loading: authLoading } = useProtectedRoute();
  // const { gameId } = useParams();
  // const { 
  //   currentGame, 
  //   gameHistory, 
  //   loading: gameLoading, 
  //   error, 
  //   fetchGameById, 
  //   fetchGameHistory 
  // } = useGame();

  // useEffect(() => {
  //   if (gameId) {
  //     fetchGameById(gameId);
  //     fetchGameHistory(gameId);
  //   }
  // }, [gameId, fetchGameById, fetchGameHistory]);

  // if (authLoading || gameLoading) {
  //   return <div>Loading...</div>;
  // }

  // if (error) {
  //   return <div>Error: {error}</div>;
  // }

  // if (!currentGame) {
  //   return <div>Game not found</div>;
  // }

  return (
    <div>
      <h1>Game</h1>
      <p>Status</p>
    </div>
  );
};

export default Game; 