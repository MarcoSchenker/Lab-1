import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/HeaderDashboard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="dashboard-skinpage-container">
      <Header />
      <div className="dashboard-skinpage-content">
        <motion.div 
          className="dashboard-skinpage-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="dashboard-skinpage-title">Bienvenido</h1>
          <p className="dashboard-skinpage-subtitle">¿Qué te gustaría hacer hoy?</p>
        </motion.div>
        <motion.div 
          className="dashboard-skinpage-cards"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="dashboard-skinpage-card" variants={itemVariants}>
            <Link to="/game-page" className="dashboard-skinpage-link">
              <div className="dashboard-skinpage-icon jugar">
                <svg width="38" height="38" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M8 5v14l11-7L8 5Z"/></svg>
              </div>
              <div className="dashboard-skinpage-card-title">Jugar Offline</div>
              <div className="dashboard-skinpage-card-desc">Juega contra la IA o practica sin conexión.</div>
            </Link>
          </motion.div>
          <motion.div className="dashboard-skinpage-card" variants={itemVariants}>
            <Link to="/salas" className="dashboard-skinpage-link">
              <div className="dashboard-skinpage-icon salas">
                <svg width="38" height="38" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>
              </div>
              <div className="dashboard-skinpage-card-title">Salas</div>
              <div className="dashboard-skinpage-card-desc">Únete o crea partidas multijugador en línea.</div>
            </Link>
          </motion.div>
          <motion.div className="dashboard-skinpage-card" variants={itemVariants}>
            <Link to="/skins" className="dashboard-skinpage-link">
              <div className="dashboard-skinpage-icon skins">
                <svg width="38" height="38" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 2 2 7l10 5 10-5-10-5Zm0 7.19L4.24 7 12 3.81 19.76 7 12 9.19ZM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div className="dashboard-skinpage-card-title">Skins</div>
              <div className="dashboard-skinpage-card-desc">Personaliza tus cartas y tu experiencia visual.</div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;