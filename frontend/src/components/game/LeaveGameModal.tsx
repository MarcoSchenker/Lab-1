import React from 'react';
import './LeaveGameModal.css';

interface LeaveGameModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LeaveGameModal: React.FC<LeaveGameModalProps> = ({
  isVisible,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="leave-game-modal-overlay">
      <div className="leave-game-modal">
        <div className="leave-game-header">
          <h2>⚠️ ¿Abandonar Partida?</h2>
        </div>

        <div className="leave-game-content">
          <div className="warning-message">
            <p className="main-warning">
              <strong>¿Estás seguro que deseas abandonar la partida?</strong>
            </p>
            
            <div className="consequences">
              <h4>Consecuencias al abandonar:</h4>
              <ul>
                <li>🚫 <strong>No podrás volver a unirte</strong> a esta partida</li>
                <li>💀 <strong>Perderás automáticamente</strong> la partida</li>
                <li>🏆 <strong>El equipo contrincante ganará</strong> por abandono</li>
                <li>📊 Se registrará como una <strong>derrota</strong> en tus estadísticas</li>
              </ul>
            </div>

            <div className="recommendation">
              <p>
                💡 <strong>Recomendación:</strong> Es mejor jugar hasta el final. 
                ¡Siempre hay oportunidad de remontar en el truco!
              </p>
            </div>
          </div>
        </div>

        <div className="leave-game-actions">
          <button 
            className="btn-cancel-leave"
            onClick={onCancel}
          >
            🎮 Continuar Jugando
          </button>
          
          <button 
            className="btn-confirm-leave"
            onClick={onConfirm}
          >
            🚪 Sí, Abandonar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGameModal;
