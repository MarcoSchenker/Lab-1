import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCopy } from 'react-icons/fa';

interface Equipo {
  id: number;
  nombre: string;
  puntosPartida: number;
  jugadoresIds: number[];
}

interface GameHeaderProps {
  equipos: Equipo[];
  codigoSala: string;
  puntosVictoria: number;
  numeroRondaActual: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({ 
  equipos, 
  codigoSala, 
  puntosVictoria,
  numeroRondaActual 
}) => {
  const navigate = useNavigate();

  const copiarCodigoSala = () => {
    navigator.clipboard.writeText(codigoSala);
    // Aquí podrías mostrar un toast o notificación
  };

  const volverASalas = () => {
    if (window.confirm('¿Estás seguro de que quieres salir de la partida?')) {
      navigate('/salas');
    }
  };

  return (
    <header className="game-header-compact">
      <div className="header-content">
        {/* Left section - Navigation */}
        <div className="header-left">
          <button 
            className="btn-back-compact"
            onClick={volverASalas}
            title="Volver a salas"
          >
            <FaHome />
          </button>
          
          <div className="room-info-compact">
            <div className="room-code-compact">
              <span>Sala: {codigoSala}</span>
              <button 
                className="btn-copy-compact"
                onClick={copiarCodigoSala}
                title="Copiar código"
              >
                <FaCopy />
              </button>
            </div>
          </div>
        </div>

        {/* Center section - Teams and Scores */}
        <div className="header-center">
          <div className="teams-score-compact">
            {equipos.map((equipo, index) => (
              <div key={equipo.id} className="team-score-compact">
                <div className="team-info-compact">
                  <span className={`team-name team-${equipo.id}`}>{equipo.nombre}</span>
                  <div className="score-display-compact">
                    <span className="current-score">{equipo.puntosPartida}</span>
                    <span className="score-separator">/</span>
                    <span className="target-score">{puntosVictoria}</span>
                  </div>
                </div>
                {index < equipos.length - 1 && <div className="vs-separator">VS</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Right section - Game status */}
        <div className="header-right">
          <div className="round-info-compact">
            <span>Ronda {numeroRondaActual}</span>
          </div>
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>En juego</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;
