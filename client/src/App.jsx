import { useContext, useState } from 'react'
import './index.css';
import Home from './pages/home/Home.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Register } from './pages/auth/Register.jsx';
import Login from './pages/auth/Login.jsx'
import { Game } from './pages/game/Game.jsx';
import GamePage from './pages/game/GamePage.jsx'


function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}
function App() {
  const [count, setCount] = useState(0)
 


  return (
    <>
      <AuthProvider>
        <Router>

          <Routes>
            <Route path='/register'
              element={<Register />} />

            <Route path='/login'
              element={<Login />} />



            <Route path='/'

              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />

            <Route path='/game'
              element={
                <PrivateRoute>
                  <Game />
                </PrivateRoute>
              } />
            <Route path='/main'
              element={
                <PrivateRoute>
                  <GamePage/>
                </PrivateRoute>
              } />
          </Routes>



        </Router>
      </AuthProvider >


    </>
  )
}

export default App
