import React, { useState } from 'react';
import './GameStateViewer.css';

interface GameStateViewerProps {
  gameState: any;
  socketId: string | null;
  onManualRefresh?: () => void;
}

/**
 * Advanced component for viewing and diagnosing game state issues
 */
const GameStateViewer: React.FC<GameStateViewerProps> = ({ 
  gameState, 
  socketId,
  onManualRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'teams' | 'rounds'>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  if (!gameState) {
    return (
      <div className="game-state-viewer error-state">
        <h3>Estado de Juego No Disponible</h3>
        <p>No hay estado de juego cargado actualmente.</p>
        {onManualRefresh && (
          <button className="refresh-button" onClick={onManualRefresh}>
            Intentar Refrescar Estado
          </button>
        )}
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const renderOverviewTab = () => (
    <div className="tab-content">
      <div className="state-section">
        <h4 onClick={() => toggleSection('general')}>
          Información General {expandedSections.general ? '▼' : '▶'}
        </h4>
        {expandedSections.general && (
          <div className="section-details">
            <p><strong>Código Sala:</strong> {gameState.codigoSala}</p>
            <p><strong>Estado Partida:</strong> {gameState.estadoPartida}</p>
            <p><strong>Tipo Partida:</strong> {gameState.tipoPartida}</p>
            <p><strong>Puntos Victoria:</strong> {gameState.puntosVictoria}</p>
            <p><strong>Ronda Actual:</strong> {gameState.numeroRondaActual}</p>
            <p><strong>Total Jugadores:</strong> {gameState.jugadores?.length || 0}</p>
            <p><strong>Socket ID:</strong> {socketId || 'No conectado'}</p>
          </div>
        )}
      </div>

      <div className="state-section">
        <h4 onClick={() => toggleSection('errors')}>
          Detección de Problemas {expandedSections.errors ? '▼' : '▶'}
        </h4>
        {expandedSections.errors && (
          <div className="section-details error-analysis">
            {gameState.mensajeError && (
              <p className="error-item">⚠️ Error registrado: {gameState.mensajeError}</p>
            )}
            {!gameState.jugadores || gameState.jugadores.length === 0 ? (
              <p className="error-item">⚠️ No hay jugadores en el estado!</p>
            ) : (
              <p className="ok-item">✅ Hay {gameState.jugadores.length} jugadores registrados</p>
            )}
            {!gameState.equipos || gameState.equipos.length === 0 ? (
              <p className="error-item">⚠️ No hay equipos en el estado!</p>
            ) : (
              <p className="ok-item">✅ Hay {gameState.equipos.length} equipos registrados</p>
            )}
            {!gameState.rondaActual ? (
              <p className="error-item">⚠️ No hay información de ronda actual!</p>
            ) : (
              <p className="ok-item">✅ Información de ronda actual presente</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderPlayersTab = () => (
    <div className="tab-content">
      <h3>Jugadores ({gameState.jugadores?.length || 0})</h3>
      <div className="players-list">
        {gameState.jugadores?.map((jugador: any) => (
          <div key={jugador.id} className="player-card">
            <h4>{jugador.nombreUsuario} (ID: {jugador.id})</h4>
            <p><strong>Equipo:</strong> {jugador.equipoId}</p>
            <p><strong>Es Pie:</strong> {jugador.esPie ? 'Sí' : 'No'}</p>
            <p><strong>Conexión:</strong> {jugador.estadoConexion}</p>
            <p><strong>Cartas en mano:</strong> {jugador.cartasMano ? jugador.cartasMano.length : 'No visible'}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeamsTab = () => (
    <div className="tab-content">
      <h3>Equipos ({gameState.equipos?.length || 0})</h3>
      <div className="teams-list">
        {gameState.equipos?.map((equipo: any) => (
          <div key={equipo.id} className="team-card">
            <h4>{equipo.nombre} (ID: {equipo.id})</h4>
            <p><strong>Puntos:</strong> {equipo.puntosPartida}</p>
            <p><strong>Jugadores:</strong> {equipo.jugadoresIds?.join(', ') || 'Ninguno'}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRoundsTab = () => (
    <div className="tab-content">
      <h3>Ronda Actual (#{gameState.numeroRondaActual})</h3>
      {gameState.rondaActual ? (
        <div className="round-info">
          <p><strong>Jugador Mano:</strong> {gameState.rondaActual.jugadorManoId || 'No asignado'}</p>
          <p><strong>Jugador Turno:</strong> {gameState.rondaActual.turnoInfo?.jugadorTurnoActualId || 'No asignado'}</p>
          <p><strong>Mano Actual:</strong> {gameState.rondaActual.turnoInfo?.manoActualNumero || 1}</p>
          
          <div className="envido-section">
            <h4>Estado Envido</h4>
            <p><strong>Cantado:</strong> {gameState.rondaActual.envidoInfo?.cantado ? 'Sí' : 'No'}</p>
            <p><strong>Nivel:</strong> {gameState.rondaActual.envidoInfo?.nivelActual || 'Ninguno'}</p>
          </div>

          <div className="truco-section">
            <h4>Estado Truco</h4>
            <p><strong>Cantado:</strong> {gameState.rondaActual.trucoInfo?.cantado ? 'Sí' : 'No'}</p>
            <p><strong>Nivel:</strong> {gameState.rondaActual.trucoInfo?.nivelActual || 'Ninguno'}</p>
            <p><strong>Puntos:</strong> {gameState.rondaActual.trucoInfo?.puntosEnJuego || 1}</p>
          </div>
        </div>
      ) : (
        <p>No hay datos de la ronda actual</p>
      )}
    </div>
  );

  return (
    <div className="game-state-viewer">
      <div className="viewer-header">
        <h2>Estado de Juego</h2>
        {onManualRefresh && (
          <button className="refresh-button" onClick={onManualRefresh}>
            Refrescar
          </button>
        )}
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          General
        </button>
        <button 
          className={activeTab === 'players' ? 'active' : ''} 
          onClick={() => setActiveTab('players')}
        >
          Jugadores
        </button>
        <button 
          className={activeTab === 'teams' ? 'active' : ''} 
          onClick={() => setActiveTab('teams')}
        >
          Equipos
        </button>
        <button 
          className={activeTab === 'rounds' ? 'active' : ''} 
          onClick={() => setActiveTab('rounds')}
        >
          Rondas
        </button>
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'players' && renderPlayersTab()}
      {activeTab === 'teams' && renderTeamsTab()}
      {activeTab === 'rounds' && renderRoundsTab()}
    </div>
  );
};

export default GameStateViewer;
