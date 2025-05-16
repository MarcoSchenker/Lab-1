import React from 'react';
import { Link } from 'react-router-dom';
import { FaGamepad, FaUsers, FaPalette } from 'react-icons/fa';;
import Header from '../components/HeaderDashboard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  
  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Bienvenido al Juego</h1>
          <div className="dashboard-subtitle">¿Qué te gustaría hacer?</div>
        </div>
        
        <div className="dashboard-options">
          <Link to="/game-page" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaGamepad />
              </div>
              <h2>Jugar Offline</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Juega partidas contra la IA o en modo práctica sin conexión.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Comenzar</button>
            </div>
          </Link>

          <Link to="/salas" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaUsers />
              </div>
              <h2>Salas Online</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Únete o crea salas multijugador para competir con otros usuarios.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Explorar Salas</button>
            </div>
          </Link>

          <Link to="/skins" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaPalette />
              </div>
              <h2>Skins</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Personaliza tus cartas y mejora tu experiencia visual del juego.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Ver Skins</button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;