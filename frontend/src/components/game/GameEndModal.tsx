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

interface RecompensaJugador {
  jugadorId: number;
  nombreJugador: string;
  equipoId: number;
  esGanador: boolean;
  eloAnterior: number;
  cambioEloPartida: number;
  cambioEloEnvido: number;
  cambioEloTotal: number;
  nuevoElo: number;
  monedasGanadas: number;
  nuevasVictorias: number;
  nuevasDerrotas: number;
  nuevasPartidas: number;
  ganoEnvido?: boolean;
  perdioEnvido?: boolean;
}

interface GameEndModalProps {
  isVisible: boolean;
  equipos: Equipo[];
  jugadores: Jugador[];
  jugadorActualId: number | null;
  puntosVictoria: number;
  recompensas?: { [key: string]: RecompensaJugador } | null;
  onVolverASala: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  isVisible,
  equipos,
  jugadores,
  jugadorActualId,
  puntosVictoria,
  recompensas,
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

  // Obtener recompensa de un jugador
  const getRecompensaJugador = (jugadorId: number) => {
    if (!recompensas) return null;
    return recompensas[jugadorId.toString()] || null;
  };

  // Obtener mi recompensa
  const miRecompensa = getRecompensaJugador(jugadorActualId);

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
          {/* Sección de Recompensas */}
          {recompensas && (
            <div className="rewards-section">
              <h2>🏆 Recompensas</h2>
              <div className="rewards-summary">
                {miRecompensa && (
                  <div className="my-rewards">
                    <div className="reward-item elo-reward">
                      <span className="reward-label">ELO:</span>
                      <span className="reward-value">
                        {miRecompensa.eloAnterior} → {miRecompensa.nuevoElo}
                        <span className={`elo-change ${miRecompensa.cambioEloTotal >= 0 ? 'positive' : 'negative'}`}>
                          ({miRecompensa.cambioEloTotal >= 0 ? '+' : ''}{miRecompensa.cambioEloTotal})
                        </span>
                      </span>
                    </div>
                    {miRecompensa.monedasGanadas > 0 && (
                      <div className="reward-item coins-reward">
                        <span className="reward-label">💰 Monedas:</span>
                        <span className="reward-value">+{miRecompensa.monedasGanadas}</span>
                      </div>
                    )}
                    <div className="reward-breakdown">
                      <div className="breakdown-item">
                        <span>Partida: {miRecompensa.cambioEloPartida >= 0 ? '+' : ''}{miRecompensa.cambioEloPartida}</span>
                      </div>
                      {miRecompensa.cambioEloEnvido !== 0 && (
                        <div className="breakdown-item">
                          <span>Envido: {miRecompensa.cambioEloEnvido >= 0 ? '+' : ''}{miRecompensa.cambioEloEnvido}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                      {jugadoresEquipo.map(jugador => {
                        const recompensaJugador = getRecompensaJugador(jugador.id);
                        return (
                          <div 
                            key={jugador.id} 
                            className={`member ${jugador.id === jugadorActualId ? 'current-player' : ''}`}
                          >
                            <div className="member-info">
                              {jugador.nombreUsuario} {/* ✅ Usar nombreUsuario */}
                              {jugador.id === jugadorActualId && <span className="you-indicator">(Tú)</span>}
                            </div>
                            {recompensaJugador && (
                              <div className="member-rewards">
                                <span className="member-elo">
                                  ELO: {recompensaJugador.nuevoElo} 
                                  <span className={`elo-delta ${recompensaJugador.cambioEloTotal >= 0 ? 'positive' : 'negative'}`}>
                                    ({recompensaJugador.cambioEloTotal >= 0 ? '+' : ''}{recompensaJugador.cambioEloTotal})
                                  </span>
                                </span>
                                {recompensaJugador.monedasGanadas > 0 && (
                                  <span className="member-coins">💰 +{recompensaJugador.monedasGanadas}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
