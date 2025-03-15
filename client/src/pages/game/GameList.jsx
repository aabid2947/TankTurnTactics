import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../context';
import { useProtectedRoute } from '../../hooks';

const GameList = () => {
  // Protect this route
  const { loading: authLoading } = useProtectedRoute();
  const { games, loading: gameLoading, error, fetchGames } = useGame();

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  if (authLoading || gameLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Games</h1>
      {games.length === 0 ? (
        <p>No games available</p>
      ) : (
        <ul>
          {games.map((game) => (
            <li key={game._id}>
              <Link to={`/game/${game._id}`}>{game.name}</Link> - {game.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GameList; 