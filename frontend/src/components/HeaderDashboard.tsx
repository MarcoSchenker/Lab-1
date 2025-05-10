import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaSignOutAlt, FaMedal, FaUser, FaChartLine, FaTimes, FaCamera } from 'react-icons/fa';
import { IoIosArrowForward } from 'react-icons/io';
import { motion, AnimatePresence } from 'framer-motion';
import './HeaderDashboard.css';
import api from '../services/api';

const Header: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [userImage, setUserImage] = useState<string | null>(null);
  const loggedInUser = localStorage.getItem('username');
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userElo, setUserElo] = useState<number>(0);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userStats, setUserStats] = useState({
    partidasJugadas: 0,
    partidasGanadas: 0,
    derrotas: 0,
    elo: 0,
  });

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible);
  };

  const closeDropdown = () => {
    setIsDropdownVisible(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsDropdownVisible(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Obtener el ID del usuario
        const idResponse = await api.get('/usuarios/id', { params: { username: loggedInUser } });
        const userId = idResponse.data.id;
        setUserId(userId);

        // Obtener estadísticas del usuario
        const statsResponse = await api.get(`/estadisticas/${userId}`);
        setUserStats({
          partidasJugadas: statsResponse.data.partidas_jugadas,
          partidasGanadas: statsResponse.data.victorias,
          derrotas: statsResponse.data.derrotas,
          elo: statsResponse.data.elo,
        });
        setUserElo(statsResponse.data.elo);

        // Obtener monedas del usuario
        const coinsResponse = await api.get(`/usuarios/${userId}/monedas`);
        setUserCoins(coinsResponse.data.monedas);

        // Obtener foto de perfil
        const imageUrl = `${apiUrl}/usuarios/${userId}/foto?t=${new Date().getTime()}`; // Evitar caché
        setUserImage(imageUrl);
      } catch (err) {
        console.error('Error al obtener datos del usuario:', err);
      }
    };

    if (loggedInUser) {
      fetchUserData();
    }

    if (isDropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loggedInUser, isDropdownVisible, apiUrl]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    try {
      await api.post(`/usuarios/${loggedInUser}/foto-perfil`, formData);
      
      // Actualizar la foto de perfil después de subirla
      const imageUrl = `${apiUrl}/usuarios/${userId}/foto?t=${new Date().getTime()}`;
      setUserImage(imageUrl);
      
      // Reset del input file
      setFile(null);
      setSelectedFileName(null);
      
      // Feedback visual
      const toastElement = document.createElement('div');
      toastElement.className = 'toast-notification success';
      toastElement.textContent = 'Foto de perfil actualizada';
      document.body.appendChild(toastElement);
      
      setTimeout(() => {
        document.body.removeChild(toastElement);
      }, 3000);
      
    } catch (err) {
      console.error('Error al subir la foto de perfil:', err);
      
      // Feedback visual de error
      const toastElement = document.createElement('div');
      toastElement.className = 'toast-notification error';
      toastElement.textContent = 'Error al actualizar la foto';
      document.body.appendChild(toastElement);
      
      setTimeout(() => {
        document.body.removeChild(toastElement);
      }, 3000);
    }
  };

  // Animaciones para el dropdown
  const dropdownVariants = {
    hidden: { opacity: 0, x: 350 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24 
      } 
    },
    exit: { 
      opacity: 0, 
      x: 350,
      transition: { 
        ease: "easeInOut", 
        duration: 0.3 
      } 
    }
  };

  // Porcentaje de victorias
  const winPercentage = userStats.partidasJugadas > 0 
    ? Math.round((userStats.partidasGanadas / userStats.partidasJugadas) * 100) 
    : 0;

  return (
    <div className="header-component">
      <Link to="/dashboard" className="header-link">
        <img src="/CardLogo.png" alt="Logo" className="logo" />
      </Link>
      
      <div className="top-right-icons">
        <div className="profile-info">
          <div className="icon-text coins">
            <FaCoins className="coin-icon" /> {userCoins}
          </div>
          <div className="icon-text elo">
            <FaMedal className="medal-icon" /> {userElo}
          </div>
          <div
            className="profile-icon-wrapper"
            onClick={toggleDropdown}
          >
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
          <button className="bg-black" onClick={handleSignOut} title="Cerrar sesión">
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isDropdownVisible && (
          <motion.div 
            className="dropdown-menu"
            ref={dropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
           
            
            <div className="dropdown-menu-profile">
              <div className="profile-avatar-container">
                {userImage ? (
                  <div
                    className="profile-avatar"
                    style={{
                      backgroundImage: `url(${userImage})`,
                    }}
                  />
                ) : (
                  <div className="profile-avatar profile-avatar-placeholder">
                    <FaUser />
                  </div>
                )}
                <button className="change-photo-button" onClick={handleUploadClick}>
                  <FaCamera />
                </button>
              </div>
              <h2 className="dropdown-username">{loggedInUser}</h2>
              <div className="dropdown-elo">
                <FaMedal className="dropdown-medal-icon" /> {userStats.elo} ELO
              </div>
            </div>
            
            <div className="dropdown-menu-section">
              <h3 className="dropdown-menu-section-title">Estadísticas</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{userStats.partidasJugadas}</div>
                  <div className="stat-label">Partidas</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userStats.partidasGanadas}</div>
                  <div className="stat-label">Victorias</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userStats.derrotas}</div>
                  <div className="stat-label">Derrotas</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{winPercentage}%</div>
                  <div className="stat-label">% Victoria</div>
                </div>
              </div>
            </div>
            
            <div className="dropdown-menu-section upload-section">
              <h3 className="dropdown-menu-section-title">Cambiar foto de perfil</h3>
              <div className="upload-description">
                Selecciona una nueva imagen para tu perfil
              </div>
              
              <div className="upload-buttons">
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                
                <button 
                  className="custom-file-upload"
                  onClick={handleUploadClick}
                >
                  Seleccionar archivo
                </button>
                
                <button 
                  className={`upload-button ${!file ? 'disabled' : ''}`}
                  onClick={handleUpload}
                  disabled={!file}
                >
                  Subir foto
                </button>
              </div>
              
              {selectedFileName && (
                <div className="file-selected">
                  {selectedFileName}
                </div>
              )}
            </div>
            
            <div className="actions-container">
              <button
                className="profile-action-button modify-profile-button"
                onClick={() => navigate('/modificar-perfil')}
              >
                <span>Modificar Perfil</span>
                <IoIosArrowForward />
              </button>
              
              <button
                className="profile-action-button stats-button"
                onClick={() => navigate('/user/' + userId)}
              >
                <span>Ver Estadísticas Completas</span>
                <FaChartLine />
              </button>
              
              <button
                className="profile-action-button delete-profile-button"
                onClick={() => navigate('/eliminar-perfil')}
              >
                <span>Eliminar Cuenta</span>
                <IoIosArrowForward />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Header;