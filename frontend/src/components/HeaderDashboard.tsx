import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaSignOutAlt, FaMedal } from 'react-icons/fa';
import './HeaderDashboard.css';
import api from '../services/api';

const Header: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL; // Obtén la URL base del backend desde las variables de entorno 
  const [userImage, setUserImage] = useState<string | null>(null); // Imagen por defecto
  const loggedInUser = localStorage.getItem('username'); // Obtener el username del localStorage
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null); // Archivo de imagen
  const [isDropdownVisible, setIsDropdownVisible] = useState(false); // Estado para controlar el menú desplegable
  const dropdownRef = useRef<HTMLDivElement>(null); // Referencia al menú desplegable
  const [userId, setUserId] = useState<number | null>(null); // ID del usuario
  const [userElo, setUserElo] = useState<number>(0); // Elo del usuario
  const [userCoins, setUserCoins] = useState<number>(0); // Monedas del usuario
  const [userStats, setUserStats] = useState({
    partidasJugadas: 0,
    partidasGanadas: 0,
    derrotas: 0,
    elo: 0,
  });

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible); // Alterna la visibilidad del menú
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsDropdownVisible(false); // Cierra el menú si se hace clic fuera de él
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
  }, [loggedInUser, isDropdownVisible]);

  useEffect(() => {
    console.log('Imagen de perfil actualizada:', userImage);
  }, [userImage]);

  useEffect(() => {
    console.log('ID del usuario:', userId);
    console.log('URL de la foto de perfil:', userImage);
  }, [userId, userImage]);

  const handleSignOut = () => {
    localStorage.clear(); // Limpiamos el local storage
    navigate('/'); // Redirige a la página de inicio
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      alert('Foto de perfil subida exitosamente');

      // Actualizar la foto de perfil después de subirla
      const imageResponse = await api.get(`/usuarios/${userId}/foto-perfil`, {
        responseType: 'blob',
      });
      const imageUrl = URL.createObjectURL(imageResponse.data);
      setUserImage(imageUrl);
    } catch (err) {
      console.error('Error al subir la foto de perfil:', err);
      alert('Error al subir la foto de perfil');
    }
  };

  return (
    <div className="header-component">
      <Link to="/dashboard" className="header-link">
        <img src="/CardLogo.png" alt="Logo" className="logo" />
      </Link>
      <div className="top-right-icons">
        <div className="profile-info">
        {userImage ? (
          <div
            className="profile-icon"
            style={{
              backgroundImage: `url(${userImage})`,
              backgroundColor: 'transparent',
            }}
            onClick={toggleDropdown} // Muestra el menú al hacer clic en la imagen
          ></div>
        ) : (
          <div
            className="profile-icon"
            style={{
              backgroundColor: '#ccc', // Fondo gris mientras carga
            }}
          ></div>
        )}
          <div className="icon-text">
            <FaCoins /> {userCoins}
          </div>
          <div className="icon-text">
            <FaMedal /> {userElo}
          </div>
          <Link to="/" className="icon-link" onClick={handleSignOut}>
            <FaSignOutAlt className="icon" title="Cerrar sesión" />
          </Link>
        </div>
        {isDropdownVisible && (
          <div
            className={`dropdown-menu ${isDropdownVisible ? 'open' : ''}`}
            ref={dropdownRef} // Asigna la referencia al menú
          >
            <div
              className="profile-icon"
              style={{
                backgroundImage: `url(${userImage})`,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
          ></div>
          <button
        className="modify-profile-button"
        onClick={() => navigate('/modificar-perfil')} // Redirige a la página de modificar perfil
      >
        Modificar Perfil
      </button>            
            <p>Nombre de Usuario: {loggedInUser}</p> <br />
            <p>Partidas Jugadas: {userStats.partidasJugadas}</p> <br />
            <p>Partidas Ganadas: {userStats.partidasGanadas}</p> <br />
            <p>Derrotas: {userStats.derrotas}</p> <br />
            <p>ELO: {userStats.elo}</p> <br />
            <div className="upload-section">
              <label htmlFor="file-upload" className="custom-file-upload">
                Seleccionar archivo
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }} // Oculta el input
              />
            <br>
            </br>
              <button onClick={handleUpload}>Subir Foto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;