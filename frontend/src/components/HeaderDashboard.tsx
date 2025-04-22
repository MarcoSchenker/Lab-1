import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'
import { FaCoins, FaSignOutAlt, FaMedal } from 'react-icons/fa';
import './HeaderDashboard.css';
import api from '../services/api';


const Header: React.FC = () => {
  const [userImage, setUserImage] = useState<string>('/foto_anonima.jpg'); // Imagen por defecto
  const loggedInUser = localStorage.getItem('username');
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null); // Archivo de imagen
  const [isDropdownVisible, setIsDropdownVisible] = useState(false); // Estado para controlar el menú desplegable
  const [userElo, setUserElo] = useState<number>(0); // Elo del usuario
  const [userCoins, setUserCoins] = useState<number>(0); // Monedas del usuario
  const [userStats, setUserStats] = useState({
      partidasJugadas: 0,
      partidasGanadas: 0,
      derrotas: 0,
      elo: 0,
    });

    useEffect(() => {
      const fetchUserData = async () => {
        try {
          // Obtener estadísticas del usuario
          const statsResponse = await api.get(`/estadisticas/${loggedInUser}`);
          setUserStats({
            partidasJugadas: statsResponse.data.partidas_jugadas,
            partidasGanadas: statsResponse.data.victorias,
            derrotas: statsResponse.data.derrotas,
            elo: statsResponse.data.elo,
          });
          setUserElo(statsResponse.data.elo);
    
          // Obtener monedas del usuario
          const coinsResponse = await api.get(`/usuarios/${loggedInUser}/monedas`);
          setUserCoins(coinsResponse.data.monedas);
    
          // Obtener foto de perfil
          const imageResponse = await api.get(`/usuarios/${loggedInUser}/foto-perfil`, {
            responseType: 'blob',
          });
          const imageUrl = URL.createObjectURL(imageResponse.data);
          setUserImage(imageUrl);
        } catch (err) {
          console.error('Error al obtener datos del usuario:', err);
          setUserImage('/foto_anonima.jpg'); // Imagen por defecto en caso de error
        }
      };
    
      if (loggedInUser) {
        fetchUserData();
      }
    }, [loggedInUser]);

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible); // Alterna la visibilidad del menú
  };

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
      const imageResponse = await api.get(`/usuarios/${loggedInUser}/foto-perfil`, {
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
          <Link to="/" className="icon-link" onClick={handleSignOut}>
            <FaSignOutAlt className="icon" title="Cerrar sesión" />
          </Link>
        </div>
        {isDropdownVisible && ( // Muestra el menú desplegable si el estado es true
          <div className="dropdown-menu">
            <p>Partidas Jugadas: {userStats.partidasJugadas}</p>
            <p>Partidas Ganadas: {userStats.partidasGanadas}</p>
            <p>Derrotas: {userStats.derrotas}</p>
            <p>ELO: {userStats.elo}</p>
          <div className='upload-section'>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button onClick={handleUpload}>Subir Foto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;