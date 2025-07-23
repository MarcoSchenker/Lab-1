import React from 'react';
import './GameEndModal.css';

interface Equipo {
  id: number;
  nombre: string;
  puntosPartida: number; // ✅ Cambiar de 'puntos' a 'puntosPartida'
  jugadoresIds: number[];
}

interface Jugador {
  id: number;
  nombreUsuario: string; // ✅ Cambiar de 'nombre' a 'nombreUsuario'
  equipoId: number;
}

interface GameEndModalProps {
  isVisible: boolean;
  equipos: Equipo[];
  jugadores: Jugador[];
  jugadorActualId: number | null;
  puntosVictoria: number;
  onVolverASala: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  isVisible,
  equipos,
  jugadores,
  jugadorActualId,
  puntosVictoria,
  onVolverASala
}) => {
  if (!isVisible || !jugadorActualId) return null;

  // Encontrar el equipo del jugador actual
  const miEquipo = equipos.find(equipo => equipo.jugadoresIds.includes(jugadorActualId));
  
  // Determinar el equipo ganador
  const equipoGanador = equipos.find(equipo => equipo.puntosPartida >= puntosVictoria); // ✅ Usar puntosPartida
  
  // Determinar si gané o perdí
  const gane = miEquipo && equipoGanador && miEquipo.id === equipoGanador.id;
  
  // Obtener información de jugadores por equipo
  const getJugadoresEquipo = (equipoId: number) => {
    return jugadores.filter(jugador => jugador.equipoId === equipoId);
  };

  return (
    <div className="game-end-modal-overlay">
      <div className="game-end-modal">
        <div className={`game-end-header ${gane ? 'victory' : 'defeat'}`}>
          <h1>{gane ? '🎉 ¡VICTORIA!' : '💀 DERROTA'}</h1>
          <p className="game-end-subtitle">
            {gane ? '¡Felicitaciones! Has ganado la partida' : 'Mejor suerte la próxima vez'}
          </p>
        </div>

        <div className="game-end-content">
          <div className="final-scores">
            <h2>Puntuación Final</h2>
            <div className="teams-final-score">
              {equipos.map(equipo => {
                const jugadoresEquipo = getJugadoresEquipo(equipo.id);
                const esGanador = equipoGanador && equipo.id === equipoGanador.id;
                const esMiEquipo = miEquipo && equipo.id === miEquipo.id;
                
                return (
                  <div 
                    key={equipo.id} 
                    className={`team-final-card ${esGanador ? 'winner' : 'loser'} ${esMiEquipo ? 'my-team' : ''}`}
                  >
                    <div className="team-final-header">
                      <h3>{equipo.nombre}</h3>
                      {esGanador && <span className="winner-crown">👑</span>}
                    </div>
                    
                    <div className="team-final-score">
                      <span className="score-number">{equipo.puntosPartida}</span> {/* ✅ Usar puntosPartida */}
                      <span className="score-total">/ {puntosVictoria}</span>
                    </div>
                    
                    <div className="team-members">
                      {jugadoresEquipo.map(jugador => (
                        <div 
                          key={jugador.id} 
                          className={`member ${jugador.id === jugadorActualId ? 'current-player' : ''}`}
                        >
                          {jugador.nombreUsuario} {/* ✅ Usar nombreUsuario */}
                          {jugador.id === jugadorActualId && <span className="you-indicator">(Tú)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="game-end-stats">
            <div className="stat-item">
              <span className="stat-label">Puntos para ganar:</span>
              <span className="stat-value">{puntosVictoria}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resultado:</span>
              <span className={`stat-value ${gane ? 'victory-text' : 'defeat-text'}`}>
                {gane ? 'Victoria' : 'Derrota'}
              </span>
            </div>
          </div>
        </div>

        <div className="game-end-actions">
          <button 
            className="btn-back-to-lobby"
            onClick={onVolverASala}
          >
            🏠 Volver a la Sala
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndModal;
