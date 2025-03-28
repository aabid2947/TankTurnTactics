import { useContext, useState } from 'react'
import './index.css';
import Home from './pages/home/Home.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { GameProvider } from './context/GameContext.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Register } from './pages/auth/Register.jsx';
import Login from './pages/auth/Login.jsx'
import { Game } from './pages/game/Game.jsx';
import GamePage from './pages/game/GamePage.jsx'
import WaitingRoom from './pages/game/WaitingRoom.jsx';
import { ChatProvider } from './context/ChatContext.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <AuthProvider>
        <ChatProvider>
          <Router>
            <Routes>
              <Route path='/register'
                element={<Register />} />

              <Route path='/login'
                element={<Login />} />

              <Route path='/'
                element={
                  <PrivateRoute>
                    <GameProvider>
                      <Home />
                    </GameProvider>
                  </PrivateRoute>
                }
              />

              <Route path='/game'
                element={
                  <PrivateRoute>
                    <GameProvider>
                      <Game />
                    </GameProvider>
                  </PrivateRoute>
                } />
              <Route path='/main'
                element={
                  <PrivateRoute>
                    <GameProvider>
                      <GamePage />
                    </GameProvider>
                  </PrivateRoute>
                } />

              <Route path='/lobby'
                element={
                  <PrivateRoute>
                    <GameProvider>
                      <WaitingRoom />
                    </GameProvider>
                  </PrivateRoute>
                } />

            </Routes>
          </Router>
        </ChatProvider>
      </AuthProvider>
    </>
  )
}

export default App