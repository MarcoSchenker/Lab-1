import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import ElegirDificultad from './pages/ElegirDificultad';
import JugarOffline from './pages/JugarOffline';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/stats/:userId" element={<StatsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path='/elegir-dificultad' element={<ElegirDificultad />} />
        <Route path="/jugar-offline" element={<JugarOffline />} />
      </Routes>
    </Router>
  );
}

export default App;
