import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaTrophy, FaGamepad, FaSkull, FaMedal } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './StatsPage.css';

interface Stats {
  victorias: number;
  derrotas: number;
  partidas_jugadas: number;
  elo: number;
  username: string;
}

const StatsPage: React.FC = () => {
  const { usuario_id } = useParams<{ usuario_id: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userImage, setUserImage] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  // Variantes para animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener estadísticas del usuario
        const statsResponse = await api.get(`/estadisticas/${usuario_id}`);
        setStats(statsResponse.data);

        // Obtener imagen de perfil
        const imageUrl = `${apiUrl}/usuarios/${usuario_id}/foto?t=${new Date().getTime()}`;
        setUserImage(imageUrl);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [usuario_id, apiUrl]);

  if (loading) {
    return (
      <div className="stats-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-container error">
        <div className="error-message">
          <h2>No hay estadísticas disponibles</h2>
          <p>No pudimos encontrar información para este usuario.</p>
        </div>
      </div>
    );
  }

  // Calcular la tasa de victoria
  const winRate = stats.partidas_jugadas > 0
    ? Math.round((stats.victorias / stats.partidas_jugadas) * 100)
    : 0;

  return (
    <div className="stats-container">
      <div className="skin-page-content" style={{ marginTop: 0 }}>
        <motion.div 
          className="skin-header"
          style={{ marginTop: 0, marginBottom: 10 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="stats-title">
            Estadísticas de <span style={{ color: "#d9d5d4" }}>{stats.username}   </span>  
          </h1>
          <div className="skin-controls">
            <button
              onClick={() => navigate(-1)}
              className="volver-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Volver
            </button>
          </div>
        </motion.div>
        <motion.div
          className="stats-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="profile-header"
            variants={itemVariants}
          >
            <div className="profile-photo-container">
              <div
                className="profile-photo"
                style={{
                  backgroundImage: userImage ? `url(${userImage})` : 'none'
                }}
              >
                {!userImage && <span className="photo-placeholder">{stats.username.charAt(0)}</span>}
              </div>
              <div className="glow-effect"></div>
            </div>

            <h1 className="player-name">{stats.username}</h1>
            <div className="player-rank">
              <FaMedal className="rank-icon" />
              <span className="rank-text">Rango: {getRankName(stats.elo)}</span>
            </div>
          </motion.div>

          <motion.div
            className="stats-cards"
            variants={containerVariants}
          >
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon elo">
                <FaMedal />
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stats.elo}</h3>
                <p className="stat-label">ELO</p>
              </div>
            </motion.div>

            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon victories">
                <FaTrophy />
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stats.victorias}</h3>
                <p className="stat-label">Victorias</p>
              </div>
            </motion.div>

            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon defeats">
                <FaSkull />
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stats.derrotas}</h3>
                <p className="stat-label">Derrotas</p>
              </div>
            </motion.div>

            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon games">
                <FaGamepad />
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stats.partidas_jugadas}</h3>
                <p className="stat-label">Partidas Jugadas</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="advanced-stats"
            variants={itemVariants}
          >
            <div className="win-rate-container">
              <h3>Tasa de Victoria</h3>
              <div className="win-rate-bar-container">
                <div
                  className="win-rate-bar"
                  style={{ width: `${winRate}%` }}
                >
                  <span className="win-rate-text">{winRate}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// Función auxiliar para determinar el rango según ELO
function getRankName(elo: number): string {
  if (elo >= 2400) return "Ancho de Espada";
  if (elo >= 2000) return "Ancho de Bastos";
  if (elo >= 1700) return "7 de Espada";
  if (elo >= 1500) return "7 de Oro";
  if (elo >= 1200) return "3 de Bastos";
  if (elo >= 1000) return "2 de Copa";
  if (elo >= 700) return "Ancho Falso";
  if (elo >= 500) return "12 de Oro";
  if (elo >= 300) return "7 de Bastos";
  return "4 de Copa";
}

export default StatsPage;