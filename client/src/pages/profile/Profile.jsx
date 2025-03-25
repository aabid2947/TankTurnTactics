import React, { useEffect, useState } from 'react';
import { userService } from '../../api';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  // Protect this route
  const { loading: authLoading } = useProtectedRoute();
  const { currentUser } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      setLoading(true);
      try {
        const stats = await userService.getUserStats();
        setUserStats(stats);
      } catch (error) {
        setError(error.message || 'Failed to fetch user stats');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUserStats();
    }
  }, [currentUser]);

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!currentUser) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <h2>{currentUser.username}</h2>
      <p>Email: {currentUser.email}</p>
      {userStats && (
        <div>
          <h3>Stats</h3>
          <p>Games Played: {userStats.gamesPlayed}</p>
          <p>Games Won: {userStats.gamesWon}</p>
          <p>Win Rate: {userStats.winRate}%</p>
        </div>
      )}
    </div>
  );
};

export default Profile; 