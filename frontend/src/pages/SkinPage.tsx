import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Importamos framer-motion para animaciones
import api from '../services/api';
import './SkinPage.css'; // Asegúrate de crear este archivo CSS

interface Skin {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  fecha_desbloqueo?: string;
}

const SkinPage: React.FC = () => {
  const [allSkins, setAllSkins] = useState<Skin[]>([]);
  const [userSkins, setUserSkins] = useState<Skin[]>([]);
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  // Definimos las animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const getToken = () => localStorage.getItem('token');

  const axiosConfig = () => {
    const token = getToken();
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todas las skins
      const allSkinsResponse = await api.get('/api/skins');
      
      if (Array.isArray(allSkinsResponse.data)) {
        setAllSkins(allSkinsResponse.data);
      } else {
        throw new Error('La respuesta de /api/skins no es un array');
      }

      // Obtener skins desbloqueadas por el usuario
      const userSkinsResponse = await api.get('/api/skins/user', axiosConfig());
      if (Array.isArray(userSkinsResponse.data)) {
        setUserSkins(userSkinsResponse.data);
      } else {
        throw new Error('La respuesta de /api/skins/user no es un array');
      }

      // Obtener monedas del usuario
      const userProfileResponse = await api.get('/api/usuarios/profile', axiosConfig());
      setUserCoins(userProfileResponse.data.monedas || 0);
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.error('Token inválido o expirado. Redirigiendo al inicio de sesión.');
        navigate('/');
      } else {
        console.error('Error al cargar datos:', err.message);
        setError('Error al cargar datos. Verifica la conexión con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSkin = async (skinId: number) => {
    try {
      setLoading(true);
      const response = await api.post(`/api/skins/select/${skinId}`, {}, axiosConfig());
      setSelectedSkin(allSkins.find((skin) => skin.id === skinId) || null);
      setSuccessMessage(response.data.message || 'Skin seleccionada correctamente');
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error al seleccionar skin:', err.message);
      setError('Error al seleccionar skin. Intenta nuevamente.');
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSkin = async (skinId: number, price: number) => {
    try {
      if (userCoins < price) {
        setError('No tienes suficientes monedas para desbloquear esta skin.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setLoading(true);
      const response = await api.post(`/api/skins/unlock/${skinId}`, {}, axiosConfig());
      setUserCoins(response.data.newBalance);
      const unlockedSkin = allSkins.find((skin) => skin.id === skinId);
      if (unlockedSkin) {
        setUserSkins([...userSkins, { ...unlockedSkin, fecha_desbloqueo: new Date().toISOString() }]);
      }
      setSuccessMessage(response.data.message || 'Skin desbloqueada correctamente');
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error al desbloquear skin:', err.message);
      setError('Error al desbloquear skin. Intenta nuevamente.');
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (skinId: number) => userSkins.some((skin) => skin.id === skinId);

  const isSelected = (skinId: number) => selectedSkin?.id === skinId;

  const renderSkinPreview = (skinName: string) => {
    const normalizedName = skinName || ''; 
    let imagePath = `/cartas/mazo${normalizedName}/1Swords.png`;
  
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      if (target.src.endsWith('.png')) {
        target.src = `/cartas/mazo${normalizedName}/1Swords.jpg`;
      } else {
        target.src = '/cartas/mazoOriginal/1Swords.jpg';
      }
    };
  
    return (
      <div className="skin-preview">
        <div className="skin-card-wrapper">
          <img
            src={imagePath}
            alt={`Carta de ejemplo - ${skinName}`}
            className="skin-card"
            onError={handleImageError}
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="skin-page-container">
      <div className="skin-page-content">
        <motion.div 
          className="skin-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="skin-title">Selección de Skins</h1>
          <div className="skin-controls">
            <button
              onClick={() => navigate('/dashboard')}
              className="volver-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Volver
            </button>
            <div className="coins-display">
              <svg xmlns="http://www.w3.org/2000/svg" className="coin-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="coin-count">{userCoins}</span>
            </div>
            <button
              onClick={() => navigate('/store')}
              className="comprar-monedas-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              Comprar Monedas
            </button>
          </div>
        </motion.div>

        {/* Notificaciones */}
        {error && (
          <motion.div 
            className="notification error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="notification-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}
        
        {successMessage && (
          <motion.div 
            className="notification success"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="notification-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </motion.div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <motion.div 
            className="skins-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {allSkins.map((skin) => (
              <motion.div
                key={skin.id}
                className={`skin-item ${isSelected(skin.id) ? 'selected' : ''} ${isUnlocked(skin.id) ? 'unlocked' : 'locked'}`}
                variants={itemVariants}
              >
                {renderSkinPreview(skin.nombre)}
                <div className="skin-details">
                  <h3 className="skin-name">{skin.nombre}</h3>
                  <p className="skin-price">
                    {isUnlocked(skin.id) ? 'Desbloqueado' : `${skin.precio} monedas`}
                  </p>
                  {isUnlocked(skin.id) ? (
                    <button
                      onClick={() => handleSelectSkin(skin.id)}
                      disabled={isSelected(skin.id) || loading}
                      className={`select-btn ${isSelected(skin.id) ? 'selected' : ''}`}
                    >
                      {isSelected(skin.id) ? 'Seleccionado' : 'Seleccionar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnlockSkin(skin.id, skin.precio)}
                      disabled={loading || userCoins < skin.precio}
                      className={`unlock-btn ${userCoins < skin.precio ? 'disabled' : ''}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="unlock-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Desbloquear
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SkinPage;