import React from 'react';
import './TeamsPanel.css';

interface Equipo {
  id: number;
  nombre: string;
  puntosPartida: number; // ✅ Cambiar de 'puntos' a 'puntosPartida' para coincidir con el gameState
  jugadoresIds: number[];
}

interface Jugador {
  id: number;
  nombreUsuario: string; // ✅ Cambiar de 'nombre' a 'nombreUsuario' para coincidir con el gameState
  equipoId: number;
  skinPreferida?: string;
  estaConectado?: boolean;
}

interface TeamsPanelProps {
  equipos: Equipo[];
  jugadores: Jugador[];
  jugadorActualId: number | null;
}

const TeamsPanel: React.FC<TeamsPanelProps> = ({
  equipos,
  jugadores,
  jugadorActualId
}) => {
  // Obtener jugadores de un equipo específico
  const getJugadoresEquipo = (equipoId: number) => {
    return jugadores.filter(jugador => jugador.equipoId === equipoId);
  };

  // Determinar si un equipo es el del jugador actual
  const esMiEquipo = (equipoId: number) => {
    return jugadorActualId && jugadores.find(j => j.id === jugadorActualId)?.equipoId === equipoId;
  };

  return (
    <div className="teams-panel">
      <div className="panel-title">
        <span>Equipos</span>
      </div>

      <div className="teams-content">
        {equipos.map(equipo => {
          const jugadoresEquipo = getJugadoresEquipo(equipo.id);
          const miEquipo = esMiEquipo(equipo.id);
          
          return (
            <div 
              key={equipo.id} 
              className={`team-section ${miEquipo ? 'my-team' : 'other-team'}`}
            >
              <div className="team-header">
                <h4 className="team-name">{equipo.nombre}</h4>
              </div>

              <div className="team-members">
                {jugadoresEquipo.map(jugador => (
                  <div 
                    key={jugador.id} 
                    className={`member-item ${jugador.id === jugadorActualId ? 'current-player' : ''}`}
                  >
                    <span className="member-name">{jugador.nombreUsuario}</span>
                    {jugador.id === jugadorActualId && (
                      <span className="tu-indicator"> (Tú)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamsPanel;
