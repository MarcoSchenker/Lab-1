import React, { useEffect, useRef } from 'react';
import './GameLog.css';

interface MensajeJuego {
  id: string;
  texto: string;
  tipo: 'info' | 'accion' | 'error' | 'sistema';
  timestamp: string;
}

interface GameLogProps {
  mensajes: MensajeJuego[];
}

const GameLog: React.FC<GameLogProps> = ({ mensajes }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  return (
    <div className="game-log-container">
      <div className="game-log-header">
        <h3>Historial</h3>
      </div>
      <div className="game-log-content">
        {mensajes.length === 0 ? (
          <div className="game-log-empty">No hay mensajes aún</div>
        ) : (
          mensajes.map((msg) => (
            <div key={msg.id} className={`game-log-message ${msg.tipo}`}>
              <span className="log-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="log-text">{msg.texto}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default GameLog;
