import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCopy, FaUsers } from 'react-icons/fa';

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
    <header className="game-header">
      <div className="game-header-left">
        <button 
          className="btn-back-to-rooms"
          onClick={volverASalas}
          title="Volver a salas"
        >
          <FaHome />
          <span>Salas</span>
        </button>
        
        <div className="room-info">
          <div className="room-code">
            <span>Sala: {codigoSala}</span>
            <button 
              className="btn-copy-code"
              onClick={copiarCodigoSala}
              title="Copiar código"
            >
              <FaCopy />
            </button>
          </div>
          <div className="round-info">
            <span>Ronda {numeroRondaActual}</span>
          </div>
        </div>
      </div>

      <div className="game-header-center">
        <div className="teams-score">
          {equipos.map((equipo) => (
            <div key={equipo.id} className={`team-score team-${equipo.id}`}>
              <div className="team-info">
                <FaUsers className="team-icon" />
                <span className="team-name">{equipo.nombre}</span>
              </div>
              <div className="score-display">
                <span className="current-score">{equipo.puntosPartida}</span>
                <span className="score-separator">/</span>
                <span className="target-score">{puntosVictoria}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-header-right">
        <div className="game-status">
          <span className="status-text">En juego</span>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;
