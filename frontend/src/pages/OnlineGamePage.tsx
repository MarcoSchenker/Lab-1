import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameSocket } from '../hooks/useGameSocket';

// Importar los nuevos componentes modulares
import GameHeader from '../components/game/GameHeader';
import GameBoard from '../components/game/GameBoard';
import PlayerHand from '../components/game/PlayerHand';
import ActionsPanel from '../components/game/ActionsPanel';
import GameReconnectOptions from '../components/GameReconnectOptions';
import GameStateViewer from '../components/GameStateViewer';

// Importar estilos
import '../styles/GameBoard/index.css';
import './OnlineGamePage.css';

// Componente GamePage refactorizado
const OnlineGamePage: React.FC = () => {
  const { codigo_sala } = useParams<{ codigo_sala: string }>();
  const codigoSala = codigo_sala; // Convert to camelCase for consistency
  const {
    socket,
    gameState,
    jugadorId,
    error,
    isLoading,
    reconnectAttempts,
    loadingTimeoutActive,
    jugarCarta,
    cantar,
    responderCanto,
    declararPuntosEnvido,
    declararSonBuenas,
    irseAlMazo,
    requestGameState,
    retryConnection
  } = useGameSocket(codigoSala);

  const [jugadorSkins, setJugadorSkins] = useState<Record<number, string>>({});
  const [showReconnectOption, setShowReconnectOption] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const maxReconnectAttempts = 5;

  // Debug: Log game state changes
  useEffect(() => {
    console.log('[OnlineGamePage] 🎮 Game state updated:', {
      hasGameState: !!gameState,
      isLoading,
      error,
      gameState: gameState ? {
        codigoSala: gameState.codigoSala,
        estadoPartida: gameState.estadoPartida,
        jugadoresCount: gameState.jugadores?.length,
        equiposCount: gameState.equipos?.length,
        jugadorId
      } : null
    });
  }, [gameState, isLoading, error, jugadorId]);

  // Actualizar preferencias de skins basado en el estado del juego
  useEffect(() => {
    if (!gameState) return;
    
    const nuevasSkins: Record<number, string> = {};
    gameState.jugadores.forEach(jugador => {
      nuevasSkins[jugador.id] = jugador.skinPreferida || 'Original';
    });
    setJugadorSkins(nuevasSkins);
  }, [gameState]);

  // Mostrar opciones de reconexión después de un tiempo
  useEffect(() => {
    if (error && reconnectAttempts > 0) {
      const timeout = setTimeout(() => {
        setShowReconnectOption(true);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, reconnectAttempts]);

  // Verificar si es el turno del jugador actual
  const esMiTurno = useCallback((): boolean => {
    if (!gameState || !jugadorId) return false;
    return gameState.rondaActual.turnoInfo.jugadorTurnoActualId === jugadorId;
  }, [gameState, jugadorId]);

  // Manejar declaración de puntos de envido
  const handleDeclararPuntosEnvido = useCallback((puntos: number) => {
    declararPuntosEnvido(puntos);
  }, [declararPuntosEnvido]);

  // Toggle debug panel
  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
  }, []);

  // Método para forzar refrescar el estado manualmente
  const forceRefreshState = useCallback(() => {
    console.log('[OnlineGamePage] 🔄 Solicitando estado manualmente');
    if (socket && socket.connected) {
      requestGameState();
    } else {
      console.log('[OnlineGamePage] Socket no conectado, intentando reconectar...');
      retryConnection();
    }
  }, [socket, requestGameState, retryConnection]);

  // Función para transformar datos del backend a formato esperado por GameBoard
  const transformManosJugadas = (manosFromBackend: any[]): any[] => {
    if (!Array.isArray(manosFromBackend)) return [];
    
    return manosFromBackend.map(mano => ({
      numeroMano: mano.numeroMano || 0,
      jugadas: Array.isArray(mano.jugadas) ? mano.jugadas.map((jugada: any) => ({
        jugadorId: jugada.jugadorId,
        carta: jugada.carta,
        equipoId: jugada.equipoId || 0,
        ordenJugada: jugada.ordenJugada || 0
      })) : [],
      ganadorManoEquipoId: mano.ganadorManoEquipoId || null,
      ganadorManoJugadorId: mano.ganadorManoJugadorId || null,
      fueParda: mano.fueParda || false,
      jugadorQueInicioManoId: mano.jugadorQueInicioManoId || null
    }));
  };

  if (isLoading && !loadingTimeoutActive && !gameState) {
    return (
      <div className="game-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p className="loading-message">
            {error ? `Reconectando... (${reconnectAttempts}/${maxReconnectAttempts})` : 'Cargando partida...'}
          </p>
          
          {reconnectAttempts > 2 && (
            <div style={{ marginTop: '20px' }}>
              <button
                className="retry-button"
                onClick={retryConnection}
                style={{ 
                  padding: '10px 20px', 
                  margin: '10px', 
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Reintentar Conexión
              </button>
              <button
                className="retry-button"
                onClick={() => window.location.reload()}
                style={{ 
                  padding: '10px 20px', 
                  margin: '10px', 
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Recargar Página
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // 2. Si no hay gameState (timeout o error), mostrar pantalla de recuperación
  if (!gameState) {
    return (
      <div className="game-container">
        <div className="loading-screen">
          <h2>⚠️ No se pudo cargar el juego</h2>
          <p>
            {error ? error : 'El servidor no respondió a tiempo o hubo un error de conexión.'}
          </p>
          
          <div style={{ marginTop: '20px' }}>
            <button
              className="retry-button"
              onClick={forceRefreshState}
              style={{ 
                padding: '10px 20px', 
                margin: '10px', 
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              🔄 Solicitar Estado del Juego
            </button>
            
            <button
              className="retry-button"
              onClick={retryConnection}
              style={{ 
                padding: '10px 20px', 
                margin: '10px', 
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              🔌 Reconectar Socket
            </button>
            
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
              style={{ 
                padding: '10px 20px', 
                margin: '10px', 
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              🔄 Recargar Página
            </button>
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <p>Intentos de reconexión: {reconnectAttempts}/{maxReconnectAttempts}</p>
            <p>Estado del socket: {socket?.connected ? '🟢 Conectado' : '🔴 Desconectado'}</p>
            <p>Código de sala: {codigoSala}</p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de error específica
  if (error) {
    return (
      <div className="game-container">
        <div className="error-screen">
          <h2>Error de Conexión</h2>
          <p>{error}</p>
          
          {showReconnectOption && (
            <GameReconnectOptions 
              socket={socket} 
              codigoSala={codigoSala || ''} 
              attemptCount={reconnectAttempts}
              maxAttempts={maxReconnectAttempts}
              onRetry={retryConnection}
              onRestart={() => window.location.reload()}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* Header del juego con puntajes */}
      <GameHeader 
        equipos={gameState.equipos} 
        codigoSala={codigoSala || ''} 
        puntosVictoria={gameState.puntosVictoria}
        numeroRondaActual={gameState.numeroRondaActual}
      />
      
      {/* Contenido principal del juego */}
      <main className="game-content">
        {/* Tablero de juego con jugadores - ahora más centrado */}
        <div className="game-main-area">
          <GameBoard 
            jugadores={gameState.jugadores} 
            jugadorActualId={jugadorId}
            jugadorEnTurnoId={gameState.rondaActual.turnoInfo.jugadorTurnoActualId}
            cartasEnMesa={gameState.rondaActual.turnoInfo.cartasEnMesaManoActual}
            manosJugadas={transformManosJugadas(gameState.rondaActual.turnoInfo.manosJugadas)}
            jugadorSkins={jugadorSkins}
            manoActual={gameState.rondaActual.turnoInfo.manoActualNumero - 1}
          />

          {/* Panel de acciones */}
          <ActionsPanel
            jugadorId={jugadorId}
            equipos={gameState.equipos}
            envidoInfo={gameState.rondaActual.envidoInfo}
            trucoInfo={gameState.rondaActual.trucoInfo}
            esMiTurno={esMiTurno()}
            trucoPendientePorEnvidoPrimero={gameState.rondaActual.trucoPendientePorEnvidoPrimero}
            manoActual={gameState.rondaActual.turnoInfo.manoActualNumero}
            cartasJugador={gameState.jugadores.find(j => j.id === jugadorId)?.cartasMano || []}
            onCantar={cantar}
            onResponderCanto={responderCanto}
            onDeclararPuntosEnvido={handleDeclararPuntosEnvido}
            onDeclararSonBuenas={declararSonBuenas}
            onIrseAlMazo={irseAlMazo}
          />
        </div>
      </main>

      {/* Mano del jugador - vuelve a estar fija en la parte inferior */}
      <PlayerHand 
        jugadorActualId={jugadorId}
        jugadores={gameState.jugadores}
        jugadorSkins={jugadorSkins}
        esMiTurno={esMiTurno()}
        onJugarCarta={jugarCarta}
      />
      
      {/* Botón de depuración (opcional) */}
      <div className="debug-floating-button" onClick={toggleDebugPanel}>
        <span>🔍</span>
      </div>
      
      {/* Panel de depuración */}
      {showDebugPanel && (
        <div className="debug-panel">
          <div className="debug-panel-header">
            <h3>Panel de Depuración</h3>
            <button onClick={toggleDebugPanel}>Cerrar</button>
          </div>
          
          <div className="debug-panel-content">
            <GameStateViewer 
              gameState={gameState} 
              socketId={socket?.id || null}
              onManualRefresh={forceRefreshState}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineGamePage;