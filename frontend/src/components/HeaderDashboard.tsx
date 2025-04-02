import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCoins, FaSignOutAlt, FaMedal } from 'react-icons/fa';
import './HeaderDashboard.css';

const Header: React.FC = () => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false); // Estado para controlar el menú desplegable

  const userImage = '/foto_anonima.jpg'; // Ruta de imagen anónima
  const userElo = 1200;
  const userCoins = 500;
  const userStats = {
    partidasJugadas: 150,
    partidasGanadas: 90,
    derrotas: 60,
    elo: userElo,
  };

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible); // Alterna la visibilidad del menú
  };

  return (
    <div className="header-component">
      <Link to="/dashboard" className="header-link">
        <img src="/CardLogo.png" alt="Logo" className="logo" />
        <h1 className="title">Trucho</h1>
      </Link>
      <div className="top-right-icons">
        <div className="profile-info">
          <div
            className="profile-icon"
            style={{ backgroundImage: `url(${userImage})` }}
            onClick={toggleDropdown} // Muestra/oculta el menú al hacer clic
          ></div>
          <div className="icon-text">
            <FaCoins /> {userCoins}
          </div>
          <div className="icon-text">
            <FaMedal /> {userElo}
          </div>
          <FaSignOutAlt className="icon" title="Cerrar sesión" />
        </div>
        {isDropdownVisible && ( // Muestra el menú desplegable si el estado es true
          <div className="dropdown-menu">
            <p>Partidas Jugadas: {userStats.partidasJugadas}</p>
            <p>Partidas Ganadas: {userStats.partidasGanadas}</p>
            <p>Derrotas: {userStats.derrotas}</p>
            <p>ELO: {userStats.elo}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;