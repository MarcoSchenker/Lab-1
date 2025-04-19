import React from 'react';
import { Link } from 'react-router-dom';
import { FaQuestionCircle } from 'react-icons/fa';
import { IoPersonAddSharp } from "react-icons/io5";
import Header from '../components/HeaderDashboard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-container">
      <Header />
      <div className="top-left-help">
        <FaQuestionCircle className="icon" title="Ayuda" />
      </div>
      <div className="right-add-friend">
        <Link to="/agregar-amigo" title="Agregar Amigo">
          <IoPersonAddSharp className="icon" />
        </Link>
      </div>
      <div className="game-modes">
        <Link to="/game-page" className="game-mode">
          <div>Jugar Offline</div>
        </Link>
        <Link to="/torneo" className="game-mode">
          <div>Torneo</div>
        </Link>
        <Link to="/salas" className="game-mode">
          <div>Salas (2, 4, 6 Jugadores)</div>
        </Link>
        <Link to="/store" className="game-mode tienda">
          <div>Tienda</div>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;