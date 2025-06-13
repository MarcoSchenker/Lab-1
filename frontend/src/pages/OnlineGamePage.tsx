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
import '../styles/GameBoard.css';
import './OnlineGamePage.css';

// Componente GamePage refactorizado
const OnlineGamePage: React.FC = () => {
  const { codigoSala } = useParams<{ codigoSala: string }>();
  const {
    socket,
    gameState,
    jugadorId,
    error,
    isLoading,
    reconnectAttempts,
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
  // Nuevo estado para manejar timeout y evitar loading infinito
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout de emergencia para evitar carga infinita
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('📢 Timeout de emergencia activado - Forzando fin de loading');
      setLoadingTimeout(true);
    }, 10000); // 10 segundos máximo de espera
    
    return () => clearTimeout(timer);
  }, []);

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
    if (!socket || !socket.connected) {
      console.error('Socket no conectado para refrescar estado');
      return;
    }
    requestGameState();
  }, [socket, requestGameState]);

  // SOLUCIÓN AL PROBLEMA DE LOADING INFINITO
  // Cambiamos la condición de "isLoading || !gameState" a una lógica más robusta
  if ((isLoading && !loadingTimeout) && !gameState) {
    // Pantalla de carga normal, solo mientras carga y no hayamos superado el timeout
    return (
      <div className="game-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p className="loading-message">
            {error ? 'Reconectando...' : 'Cargando partida...'}
          </p>
          
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
  
  // Si el timeout se activó pero no tenemos gameState, mostramos pantalla de solicitud manual
  if (!gameState) {
    return (
      <div className="game-container">
        <div className="loading-screen">
          <h2>No se pudo cargar el juego</h2>
          <p>El servidor no respondió a tiempo o hubo un error de conexión.</p>
          
          <button
            className="retry-button"
            onClick={forceRefreshState}
            style={{ 
              padding: '10px 20px', 
              margin: '20px 0', 
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Solicitar estado del juego
          </button>
          
          <p>
            <small>
              También puedes intentar <span 
                style={{textDecoration: 'underline', cursor: 'pointer'}}
                onClick={() => window.location.reload()}
              >recargar la página</span>.
            </small>
          </p>
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

  // Si llegamos aquí, significa que tenemos gameState y no hay error
  // Renderizamos el juego normalmente
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
        {/* Tablero de juego con jugadores */}
        <GameBoard 
          jugadores={gameState.jugadores} 
          jugadorActualId={jugadorId}
          jugadorEnTurnoId={gameState.rondaActual.turnoInfo.jugadorTurnoActualId}
          cartasEnMesa={gameState.rondaActual.turnoInfo.cartasEnMesaManoActual}
          jugadorSkins={jugadorSkins}
        />

        {/* Panel de acciones */}
        <ActionsPanel
          jugadorId={jugadorId}
          equipos={gameState.equipos}
          envidoInfo={gameState.rondaActual.envidoInfo}
          trucoInfo={gameState.rondaActual.trucoInfo}
          esMiTurno={esMiTurno()}
          trucoPendientePorEnvidoPrimero={gameState.rondaActual.trucoPendientePorEnvidoPrimero}
          onCantar={cantar}
          onResponderCanto={responderCanto}
          onDeclararPuntosEnvido={handleDeclararPuntosEnvido}
          onDeclararSonBuenas={declararSonBuenas}
          onIrseAlMazo={irseAlMazo}
        />
      </main>

      {/* Mano del jugador */}
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