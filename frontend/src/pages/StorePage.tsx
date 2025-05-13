import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import './StorePage.css';

interface CoinPackage {
  id: number;
  coins: number;
  price: number;
  description: string;
}

const StorePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [userId, setUserId] = useState<number | null>(null);

  const navigate = useNavigate();

  // Paquetes de monedas disponibles
  const coinPackages: CoinPackage[] = [
    { id: 1, coins: 50, price: 1000, description: 'Paquete básico de monedas' },
    { id: 2, coins: 125, price: 2000, description: 'Paquete estándar con 25% extra' },
    { id: 3, coins: 300, price: 4000, description: 'Paquete premium con 50% extra' },
  ];

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
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

  // Obtener el ID del usuario logueado
  const fetchUserId = async () => {
    try {
      const username = localStorage.getItem('username');
      if (!username) return;
      const res = await api.get(`/usuarios/id?username=${username}`);
      setUserId(res.data.id);
    } catch (err) {
      setError('No se pudo obtener el usuario.');
    }
  };

  // Obtener monedas del usuario
  const fetchUserCoins = async (uid?: number) => {
    try {
      setLoading(true);
      setError(null);
      const id = uid ?? userId;
      if (!id) return;
      const res = await api.get(`/usuarios/${id}/monedas`);
      setUserCoins(res.data.monedas || 0);
    } catch (err: any) {
      setError('Error al cargar monedas.');
    } finally {
      setLoading(false);
    }
  };

  // Comprar monedas (agregar directamente)
  const handleBuyCoins = async (packageId: number) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccessMessage(null);

      const selectedPackage = coinPackages.find(pkg => pkg.id === packageId);
      if (!selectedPackage || !userId) {
        setError('Paquete o usuario no encontrado');
        return;
      }

      // Llamar al endpoint para sumar monedas
      await api.post(`/usuarios/${userId}/monedas`, { cantidad: selectedPackage.coins }, axiosConfig());

      setSuccessMessage(`¡Se han agregado ${selectedPackage.coins} monedas a tu cuenta!`);
      fetchUserCoins(userId);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError('Error al agregar monedas. Intenta nuevamente.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) fetchUserCoins(userId);
  }, [userId]);

  return (
    <div className="store-page-container">
      <div className="store-page-content">
        <motion.div 
          className="store-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="store-title">Tienda de Monedas</h1>
          <div className="store-controls">
            <button
              onClick={() => navigate(-1)}
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
            className="packages-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {coinPackages.map((pkg) => (
              <motion.div
                key={pkg.id}
                className="package-item"
                variants={itemVariants}
              >
                <div className="package-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="package-details">
                  <h3 className="package-coins">{pkg.coins} Monedas</h3>
                  <p className="package-description">{pkg.description}</p>
                  <p className="package-price">$ {pkg.price.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleBuyCoins(pkg.id)}
                  disabled={processing}
                  className="buy-btn"
                >
                  {processing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    <span>Comprar</span>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StorePage;