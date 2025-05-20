import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaSignOutAlt, FaMedal, FaUser, FaChartLine, FaCamera } from 'react-icons/fa';
import { IoPersonAddSharp } from "react-icons/io5";
import { HiMiniTrophy } from "react-icons/hi2";
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
  const isAnonymous = localStorage.getItem('isAnonymous') === 'true';

  const toggleDropdown = useCallback(() => {
    // No mostrar dropdown para usuarios anónimos
    if (isAnonymous) return;
    
    requestAnimationFrame(() => {
      setIsDropdownVisible(prev => !prev);
    });
  }, [isAnonymous]);

  // Efecto para manejar el clic fuera del menú desplegable
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        requestAnimationFrame(() => {
          setIsDropdownVisible(false);
        });
      }
    };

    if (isDropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownVisible]); // Dependencia correcta

  // Efecto para obtener los datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      if (!loggedInUser) return; // Salir si no hay usuario logueado

      try {
        const idResponse = await api.get('/usuarios/id', { params: { username: loggedInUser } });
        const currentUserId = idResponse.data.id;
        setUserId(currentUserId);

        const statsResponse = await api.get(`/estadisticas/${currentUserId}`);
        setUserStats({
          partidasJugadas: statsResponse.data.partidas_jugadas,
          partidasGanadas: statsResponse.data.victorias,
          derrotas: statsResponse.data.derrotas,
          elo: statsResponse.data.elo,
        });
        setUserElo(statsResponse.data.elo);

        const coinsResponse = await api.get(`/usuarios/${currentUserId}/monedas`);
        setUserCoins(coinsResponse.data.monedas);

        // Se mantiene el timestamp para evitar caché en la imagen de perfil
        const imageUrl = `${apiUrl}/usuarios/${currentUserId}/foto?t=${new Date().getTime()}`;
        setUserImage(imageUrl);

      } catch (err) {
        console.error('Error al obtener datos del usuario:', err);
        // Considera mostrar un feedback al usuario aquí si falla la carga de datos
      }
    };

    fetchUserData();
  }, [loggedInUser, apiUrl]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleAnonymousSignOut = async () => {
  if (isAnonymous && loggedInUser) {
    try {
      // Primero intenta eliminar el usuario anónimo
      await api.delete(`/usuario-anonimo/${loggedInUser}`);
      console.log('Usuario anónimo eliminado correctamente');
    } catch (err) {
      console.error('Error al eliminar usuario anónimo:', err);
      // Continuamos con el signout incluso si falla la eliminación
    }
  }
  // En cualquier caso, hacemos el signout normal
  localStorage.clear();
  navigate('/register');
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
  if (!file || !loggedInUser) {
    alert('Por favor selecciona una imagen y asegúrate de que tu sesión esté activa.');
    return;
  }
  const formData = new FormData();
  formData.append('foto', file);
  try {
    await api.post(`/usuarios/${loggedInUser}/foto-perfil`, formData);

    const currentUserId = userId !== null ? userId : (await api.get('/usuarios/id', { params: { username: loggedInUser } })).data.id;

    const imageUrl = `${apiUrl}/usuarios/${currentUserId}/foto?t=${new Date().getTime()}`;
    setUserImage(imageUrl);

    setFile(null);
    setSelectedFileName(null);

    console.log('Foto de perfil actualizada con éxito');
  } catch (err) {
    console.error('Error al subir la foto de perfil:', err);
    console.log('Error al actualizar la foto');
  }
};
  // Variantes de animación para Framer Motion
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      x: "100%",
      pointerEvents: 'none' as const,
      transition: {
        type: "tween",
        ease: "easeOut",
        duration: 0.25 // Duración ajustada para la salida
      }
    },
    visible: {
      opacity: 1,
      x: 0, 
      pointerEvents: 'auto' as const,
      transition: {
        type: "spring", // Spring para una sensación más natural al entrar
        stiffness: 300, // Ajusta estos valores según la sensación deseada
        damping: 30,
        mass: 0.7
      }
    },
  };

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
          {!isAnonymous ? (
            <>
              <Link to="/friends" className="icon-text friends" title="Amigos">
                <IoPersonAddSharp className="friends-icon"/>
                <span>Friends</span>
              </Link>
              <Link to="/ranking" className="icon-text ranking" title="Ranking">
                <HiMiniTrophy className="trophy-icon" />
                <span>Ranking</span>
              </Link>
            </>
            ) : (
              // Botón de registro para usuarios anónimos
              <button 
                onClick={handleAnonymousSignOut} 
                className="icon-text register-btn" 
                title="Registrarse"
              >
                <FaUser className="register-icon"/>
                <span>Registrarse</span>
              </button>
              )}
          
          <div className="icon-text coins">
            <FaCoins className="coin-icon" title="Total coins"/> {userCoins}
          </div>
          <div className="icon-text elo" title="Puntos ELO">
            <FaMedal className="medal-icon" /> {userElo}
          </div>
          
          <div className="profile-icon-wrapper" title={isAnonymous ? "Usuario anónimo" : "Perfil"}>
            {userImage ? (
              <div
                className="profile-icon"
                style={{
                  backgroundImage: `url(${userImage})`,
                }}
                onClick={toggleDropdown}
              />
            ) : (
              <div 
                className="profile-icon profile-icon-placeholder"
                onClick={toggleDropdown}
              >
                <FaUser />
              </div>
            )}
          </div>
          <button className="sign-out-button" onClick={handleSignOut} title="Log out">
            <FaSignOutAlt/>
          </button>
        </div>
      </div>

      {/* Mensaje para usuario anónimo */}
      {isAnonymous && (
        <div className="anonymous-badge">
          Usuario temporal - Para guardar tu progreso, ¡regístrate!
        </div>
      )}

      <AnimatePresence>
        {isDropdownVisible && !isAnonymous && (
          <motion.div
            className="dropdown-menu"
            ref={dropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
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
                <div className="change-photo-button" onClick={handleUploadClick} title='Cambiar foto de perfil'>
                  <FaCamera/>
                </div>
              </div>
              <h2 className="dropdown-username">{loggedInUser}</h2>
              <div className="dropdown-coins">
                <FaCoins className="dropdown-coin-icon" /> {userCoins} monedas
              </div>
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
                Selecciona una nueva imagen para tu perfil y luego haz clic en "Subir foto".
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
                  className={`upload-button ${!file || userId === null ? 'disabled' : ''}`}
                  onClick={handleUpload}
                  disabled={!file || userId === null}
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
                onClick={() => userId && navigate('/user/' + userId)}
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