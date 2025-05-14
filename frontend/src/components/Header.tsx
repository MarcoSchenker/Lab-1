import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCoins, FaMedal, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { IoPersonAddSharp } from "react-icons/io5";
import { HiMiniTrophy } from "react-icons/hi2";
import './HeaderDashboard.css';
import api from '../services/api';

const Header: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userElo, setUserElo] = useState<number>(0);
  const [userCoins, setUserCoins] = useState<number>(0);
  const loggedInUser = localStorage.getItem('username');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!loggedInUser) return;
      try {
        const idResponse = await api.get('/usuarios/id', { params: { username: loggedInUser } });
        const currentUserId = idResponse.data.id;
        setUserId(currentUserId);

        const statsResponse = await api.get(`/estadisticas/${currentUserId}`);
        setUserElo(statsResponse.data.elo);

        const coinsResponse = await api.get(`/usuarios/${currentUserId}/monedas`);
        setUserCoins(coinsResponse.data.monedas);

        const imageUrl = `${apiUrl}/usuarios/${currentUserId}/foto?t=${new Date().getTime()}`;
        setUserImage(imageUrl);
      } catch (err) {
        // Opcional: manejo de error
      }
    };
    fetchUserData();
  }, [loggedInUser, apiUrl]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="header-component" style={{ background: 'transparent', boxShadow: 'none', borderBottom: 'none' }}>
      <Link to="/dashboard" className="header-link">
        <img src="/CardLogo.png" alt="Logo" className="logo" />
      </Link>
      <div className="top-right-icons">
        <div className="profile-info">
          <Link to="/friends" className="icon-text friends" title="Amigos">
            <IoPersonAddSharp className="friends-icon"/>
            <span>Friends</span>
          </Link>
          <Link to="/ranking" className="icon-text ranking" title="Ranking">
            <HiMiniTrophy className="trophy-icon" />
            <span>Ranking</span>
          </Link>
          <div className="icon-text coins">
            <FaCoins className="coin-icon" title="Total coins"/> {userCoins}
          </div>
          <div className="icon-text elo" title="Puntos ELO">
            <FaMedal className="medal-icon" /> {userElo}
          </div>
          <div className="profile-icon-wrapper" title="Profile">
            {userImage ? (
              <div
                className="profile-icon"
                style={{
                  backgroundImage: `url(${userImage})`,
                }}
              />
            ) : (
              <div className="profile-icon profile-icon-placeholder">
                <FaUser />
              </div>
            )}
          </div>
          <button className="sign-out-button" onClick={handleSignOut} title="Log out">
            <FaSignOutAlt/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;