import React from 'react';
import { Link } from 'react-router-dom';
import { FaGamepad, FaUsers, FaPalette } from 'react-icons/fa';;
import Header from '../components/HeaderDashboard';
import { useAuthValidation } from '../hooks/useAuthValidation';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  // ✅ Validación de autenticación con diagnóstico
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    showDiagnostic, 
    setShowDiagnostic 
  } = useAuthValidation();

  // ✅ Mostrar loading mientras se valida la autenticación
  if (authLoading) {
    return (
      <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '50vh'
          }}>
            <div style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 2s linear infinite'
            }}></div>
            <p style={{ marginTop: '20px', color: '#666' }}>Validando autenticación...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Si no está autenticado y no hay diagnóstico que mostrar, mostrar loading de redirección
  if (!isAuthenticated && !showDiagnostic) {
    return (
      <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '50vh'
          }}>
            <div style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 2s linear infinite'
            }}></div>
            <p style={{ marginTop: '20px', color: '#666' }}>Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-container">{/* Diagnóstico de Autenticación */}
      
      <Header />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Bienvenido a Trucho</h1>
          <div className="dashboard-subtitle">¿Qué te gustaría hacer?</div>
        </div>
        
        <div className="dashboard-options">
          <Link to="/game-page" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaGamepad />
              </div>
              <h2>Jugar Offline</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Juega partidas contra la IA o en modo práctica sin conexión.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Comenzar</button>
            </div>
          </Link>

          <Link to="/salas" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaUsers />
              </div>
              <h2>Salas Online</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Únete o crea salas multijugador para competir con otros usuarios.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Explorar Salas</button>
            </div>
          </Link>

          <Link to="/skins" className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon">
                <FaPalette />
              </div>
              <h2>Skins</h2>
            </div>
            <div className="dashboard-card-content">
              <p>Personaliza tus cartas y mejora tu experiencia visual del juego.</p>
            </div>
            <div className="dashboard-card-footer">
              <button className="dashboard-card-button">Ver Skins</button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;