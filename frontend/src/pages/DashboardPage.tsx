import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-container">
      <Header />
      <hr className="line-white" />
      <div className="dashboard-content">
        <h2>Bienvenido a tu Dashboard</h2>
        <div className="button-container">
          <Link to="/jugar">
            <button className="dashboard-button">Jugar</button>
          </Link>
          <Link to="/amigos">
            <button className="dashboard-button">Amigos</button>
          </Link>
          <Link to="/perfil">
            <button className="dashboard-button">Perfil</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;