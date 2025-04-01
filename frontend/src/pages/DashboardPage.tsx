import React from 'react';
import { Link } from 'react-router-dom';
import { FaCoins, FaSignOutAlt, FaMedal, FaQuestionCircle } from 'react-icons/fa';
import Header from '../components/Header';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const userImage = 'frontend/public/foto_anonima.jpg'; // Ruta de imagen anónima
  const userElo = 1200;
  const userCoins = 500;

  return (
    <div className="dashboard-container">
      <Header />
      <div className="top-left-help">
        <FaQuestionCircle className="icon" title="Ayuda" />
      </div>
      <div className="top-right-icons">
        <div className="profile-info">
          <div className="profile-icon" style={{ backgroundImage: `url(${userImage})` }}></div>
          <FaSignOutAlt className="icon" title="Cerrar sesión" />
          <div className="icon-text"><FaCoins /> {userCoins}</div>
          <div className="icon-text"><FaMedal /> {userElo}</div>
        </div>
      </div>
      <hr className="line-white" />
      <div className="game-modes">
        <Link to="/jugar-offline" className="game-mode">
          <div>Jugar Offline</div>
        </Link>
        <Link to="/torneo" className="game-mode">
          <div>Torneo</div>
        </Link>
        <Link to="/salas" className="game-mode">
          <div>Salas (2, 4, 6 Jugadores)</div>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;