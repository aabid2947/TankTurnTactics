import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context';
import { useProtectedRoute } from '../../hooks';

const CreateGame = () => {
  // Protect this route
  const { loading: authLoading } = useProtectedRoute();
  const { loading: gameLoading, error, createGame } = useGame();
  const navigate = useNavigate();

  if (authLoading || gameLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Create Game</h1>
      {error && <div>Error: {error}</div>}
    </div>

  );
};

export default CreateGame; 