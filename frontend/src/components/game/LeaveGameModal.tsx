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
      <div className="leave-game-modal professional">
        <div className="leave-game-header">
          <h2>⚠️ Confirmar Abandono de Partida</h2>
          <p className="modal-subtitle">Esta acción tendrá consecuencias permanentes</p>
        </div>

        <div className="leave-game-content">
          <div className="warning-section">
            <div className="main-warning">
              <h3>🚨 Abandono de Partida</h3>
              <p>Si abandonas la partida, se registrará como una <strong>derrota automática</strong>.</p>
            </div>

            

            <div className="additional-warnings">
              <h4>⚠️ Otras Consecuencias:</h4>
              <ul className="warning-list">
                <li>🚫 <strong>No podrás volver</strong> a esta partida</li>
                <li>⏱️ <strong>Penalización temporal</strong> en el matchmaking</li>
                <li>� <strong>Afecta tu reputación</strong> como jugador</li>
                <li>🎯 <strong>Reduce tus posibilidades</strong> de ganar torneos futuros</li>
              </ul>
            </div>

            <div className="recommendation-box">
              <div className="recommendation-icon">💡</div>
              <div className="recommendation-text">
                <strong>Recomendación:</strong> El truco es un juego de estrategia y suerte. 
                ¡Siempre hay oportunidad de remontar! Considera usar "irse al mazo" en manos específicas 
                en lugar de abandonar completamente.
              </div>
            </div>
          </div>
        </div>

        <div className="leave-game-actions">
          <button 
            className="btn-cancel-leave primary"
            onClick={onCancel}
          >
            🎮 Seguir Jugando
          </button>
          
          <button 
            className="btn-confirm-leave danger"
            onClick={onConfirm}
          >
            🚪 Confirmar Abandono
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGameModal;
