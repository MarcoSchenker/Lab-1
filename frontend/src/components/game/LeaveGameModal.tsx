import React, { useState, useEffect } from 'react';
import './LeaveGameModal.css';

interface Jugador {
  id: number;
  nombreUsuario: string;
  equipoId: number;
}

interface Equipo {
  id: number;
  nombre: string;
  puntosPartida: number;
  jugadoresIds: number[];
}

interface ConsequenciasAbandonoCalculadas {
  cambioEloEstimado: number;
  eloActualEstimado: number;
  nuevoEloEstimado: number;
  monedasPerdidas: number;
  partidasJugadas: number;
  derrotas: number;
}

interface LeaveGameModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  jugadorActualId: number | null;
  jugadores: Jugador[];
  equipos: Equipo[];
  codigoSala: string;
}

const LeaveGameModal: React.FC<LeaveGameModalProps> = ({
  isVisible,
  onConfirm,
  onCancel,
  jugadorActualId,
  jugadores,
  equipos,
  codigoSala
}) => {
  const [consecuenciasCalculadas, setConsecuenciasCalculadas] = useState<ConsequenciasAbandonoCalculadas | null>(null);
  const [cargandoConsecuencias, setCargandoConsecuencias] = useState(false);

  // Calcular consecuencias del abandono cuando el modal se abre
  useEffect(() => {
    if (isVisible && jugadorActualId) {
      calcularConsecuenciasAbandono();
    }
  }, [isVisible, jugadorActualId]);

  const calcularConsecuenciasAbandono = async () => {
    setCargandoConsecuencias(true);
    try {
      // Encontrar oponente para calcular ELO
      const miEquipo = equipos.find(equipo => equipo.jugadoresIds.includes(jugadorActualId!));
      const equipoOponente = equipos.find(equipo => equipo.id !== miEquipo?.id);
      const oponente = equipoOponente ? jugadores.find(j => j.equipoId === equipoOponente.id) : null;

      // Obtener estadísticas actuales del jugador
      const response = await fetch('/api/estadisticas/usuario', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const stats = await response.json();
        
        // Calcular cambio de ELO estimado (siempre negativo por abandono)
        const eloActual = stats.elo || 500;
        const eloOponente = oponente ? (await obtenerEloOponente(oponente.id)) : 500;
        
        // Usar lógica similar al backend para calcular pérdida de ELO
        const cambioEloEstimado = calcularCambioEloPorAbandono(eloActual, eloOponente);
        const nuevoEloEstimado = Math.max(100, eloActual + cambioEloEstimado);

        setConsecuenciasCalculadas({
          cambioEloEstimado,
          eloActualEstimado: eloActual,
          nuevoEloEstimado,
          monedasPerdidas: 0, // No se pierden monedas, simplemente no se ganan
          partidasJugadas: stats.partidas_jugadas + 1,
          derrotas: stats.derrotas + 1
        });
      }
    } catch (error) {
      console.error('Error calculando consecuencias:', error);
      // Valores por defecto si falla la consulta
      setConsecuenciasCalculadas({
        cambioEloEstimado: -15,
        eloActualEstimado: 500,
        nuevoEloEstimado: 485,
        monedasPerdidas: 0,
        partidasJugadas: 1,
        derrotas: 1
      });
    } finally {
      setCargandoConsecuencias(false);
    }
  };

  const obtenerEloOponente = async (oponenteId: number): Promise<number> => {
    try {
      const response = await fetch(`/api/estadisticas/estadisticas/${oponenteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const stats = await response.json();
        return stats.elo || 500;
      }
    } catch (error) {
      console.error('Error obteniendo ELO del oponente:', error);
    }
    return 500; // Valor por defecto
  };

  const calcularCambioEloPorAbandono = (eloJugador: number, eloOponente: number): number => {
    // Lógica similar al backend - siempre es una derrota (resultado = 0)
    const factorK = calcularFactorK(eloJugador);
    const eloEsperado = 1 / (1 + Math.pow(10, (eloOponente - eloJugador) / 400));
    const cambio = Math.round(factorK * (0 - eloEsperado)); // 0 = derrota
    
    // Penalización adicional por abandono
    const penalizacionAbandono = -5;
    return Math.min(cambio + penalizacionAbandono, -1); // Mínimo -1 punto
  };

  const calcularFactorK = (elo: number): number => {
    if (elo < 800) return 40;
    if (elo < 1200) return 32;
    if (elo < 1600) return 24;
    if (elo < 2000) return 16;
    if (elo < 2400) return 12;
    return 8;
  };

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

            {cargandoConsecuencias ? (
              <div className="consequences-loading">
                <div className="spinner-small"></div>
                <p>Calculando impacto en tu perfil...</p>
              </div>
            ) : consecuenciasCalculadas ? (
              <div className="consequences-preview">
                <h4>📊 Impacto en tu Perfil:</h4>
                <div className="consequence-grid">
                  <div className="consequence-item elo-impact">
                    <div className="consequence-icon">�</div>
                    <div className="consequence-details">
                      <span className="consequence-label">Rating ELO</span>
                      <span className="consequence-value">
                        {consecuenciasCalculadas.eloActualEstimado} → {consecuenciasCalculadas.nuevoEloEstimado}
                        <span className="elo-change negative">
                          ({consecuenciasCalculadas.cambioEloEstimado})
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="consequence-item stats-impact">
                    <div className="consequence-icon">📋</div>
                    <div className="consequence-details">
                      <span className="consequence-label">Estadísticas</span>
                      <span className="consequence-value">
                        +1 Partida Jugada, +1 Derrota
                      </span>
                    </div>
                  </div>

                  <div className="consequence-item coins-impact">
                    <div className="consequence-icon">💰</div>
                    <div className="consequence-details">
                      <span className="consequence-label">Monedas</span>
                      <span className="consequence-value">
                        Sin recompensa por abandono
                      </span>
                    </div>
                  </div>

                  <div className="consequence-item opponent-impact">
                    <div className="consequence-icon">🏆</div>
                    <div className="consequence-details">
                      <span className="consequence-label">Oponente</span>
                      <span className="consequence-value">
                        Victoria automática + ELO
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

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
            aria-busy={cargandoConsecuencias}
          >
            🚪 Confirmar Abandono
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGameModal;
