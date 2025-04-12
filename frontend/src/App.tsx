import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import ElegirDificultad from './pages/ElegirDificultad';
import AuthRoute from './AuthRoute'; // Importa el componente AuthRoute
import GamePage from './pages/GamePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <AuthRoute>
              <DashboardPage />
            </AuthRoute>
          }
        />
        <Route
          path="/stats/:userId"
          element={
            <AuthRoute>
              <StatsPage />
            </AuthRoute>
          }
        />
        <Route
          path="/elegir-dificultad"
          element={
            <AuthRoute>
              <ElegirDificultad />
            </AuthRoute>
          }
        />
        <Route
          path="/game-page"
          element={
            <AuthRoute>
              <GamePage />
            </AuthRoute>
          }
          />
      </Routes>
    </Router>
  );
}

export default App;
