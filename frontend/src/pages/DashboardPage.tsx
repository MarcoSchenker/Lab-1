import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/HeaderDashboard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {

  // Animaciones para elementos
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2 
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className="dashboard-container">
      <Header />
      <motion.div 
        className="game-modes"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Link to="/game-page" className="game-mode">
            <div>Jugar Offline</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link to="/torneo" className="game-mode">
            <div>Torneo</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link to="/salas" className="game-mode">
            <div>Salas</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link to="/skins" className="game-mode skins">
            <div>Skins</div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;