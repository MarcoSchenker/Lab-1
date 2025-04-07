import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import ElegirDificultad from './pages/ElegirDificultad';
import JugarOffline from './pages/JugarOffline';
import AuthRoute from './AuthRoute'; // Importa el componente AuthRoute

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/jugar-offline" element={<JugarOffline />} />

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
      </Routes>
    </Router>
  );
}

export default App;
