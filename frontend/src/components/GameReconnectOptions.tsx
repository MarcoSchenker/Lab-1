import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import gameStateDebugger from '../utils/gameStateDebugger';

interface GameReconnectOptionsProps {
  socket: Socket | null;
  codigoSala: string;
  attemptCount: number;
  maxAttempts: number;
  onRetry: () => void;
  onRestart: () => void;
  totalAttempts?: number;
}

// Network diagnostic info
interface DiagnosticInfo {
  socketConnected: boolean;
  internetConnected: boolean;
  serverReachable: boolean;
  lastCheckTime: number;
}

const GameReconnectOptions: React.FC<GameReconnectOptionsProps> = ({
  socket,
  codigoSala,
  attemptCount,
  maxAttempts,
  onRetry,
  onRestart,
  totalAttempts = 0
}) => {
  const navigate = useNavigate();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    socketConnected: false,
    internetConnected: false,
    serverReachable: false,
    lastCheckTime: 0
  });
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  const handleRetry = () => {
    gameStateDebugger.logAction('reconnect_retry_clicked', { 
      attemptCount, 
      totalAttempts,
      diagnostics: diagnosticInfo 
    });
    
    setIsLoading(true);
    onRetry();
    setTimeout(() => setIsLoading(false), 2000); // Show loading state for at least 2s
  };

  const handleForceRefresh = () => {
    gameStateDebugger.logAction('force_refresh_clicked', { socketConnected: socket?.connected });
    setIsLoading(true);
    updateDiagnosticInfo();
    
    if (socket?.connected) {
      socket.emit('cliente_solicitar_estado_juego');
      gameStateDebugger.logSocketEvent('cliente_solicitar_estado_juego', { manual: true });
      
      // Also send an explicit recovery request
      socket.emit('recovery_request', {
        codigoSala,
        timestamp: Date.now()
      });
      
      setTimeout(() => setIsLoading(false), 2000);
    } else {
      handleRetry();
    }
  };

  const handleRestart = () => {
    gameStateDebugger.logAction('restart_clicked', {});
    onRestart();
  };

  const handleBackToRooms = () => {
    gameStateDebugger.logAction('back_to_rooms_clicked', {});
    navigate('/salas');
  };

  const handleViewDebug = () => {
    gameStateDebugger.logAction('view_debug_clicked', {});
    window.open(`/debug-game.html?sala=${codigoSala}`, '_blank');
  };

  const handleRunDiagnostics = () => {
    gameStateDebugger.logAction('run_diagnostics_clicked', {});
    runDiagnostics();
  };

  const toggleAdvanced = () => {
    setIsAdvancedOpen(!isAdvancedOpen);
  };

  // Helper to determine if we're using all our retries
  const isNearMaxRetries = attemptCount >= Math.floor(maxAttempts * 0.7);

  // Effect to check socket connection status when the component mounts
  useEffect(() => {
    updateDiagnosticInfo();
  }, [socket?.connected]);

  // Check socket and internet connection status
  const updateDiagnosticInfo = () => {
    setDiagnosticInfo(prev => ({
      ...prev,
      socketConnected: !!socket?.connected,
      internetConnected: navigator.onLine,
      lastCheckTime: Date.now()
    }));
  };

  // Run full diagnostics including server ping
  const runDiagnostics = () => {
    setIsRunningDiagnostic(true);
    updateDiagnosticInfo();
    
    // Try to detect if server is reachable
    const pingServer = async () => {
      try {
        const pingStart = Date.now();
        const response = await fetch(`${process.env.VITE_API_URL}/api/ping`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
        const pingTime = Date.now() - pingStart;
        
        gameStateDebugger.logAction('server_ping', { 
          success: true, 
          pingTime,
          status: response.status 
        });
        
        setDiagnosticInfo(prev => ({
          ...prev,
          serverReachable: true
        }));
      } catch (error) {
        gameStateDebugger.logError('server_ping_failed', error);
        setDiagnosticInfo(prev => ({
          ...prev,
          serverReachable: false
        }));
      } finally {
        setIsRunningDiagnostic(false);
      }
    };
    
    pingServer();
  };

  return (
    <div className="game-reconnect-options">
      <div className="reconnect-status">
        {isLoading ? (
          <div className="reconnect-loading">
            <div className="spinner"></div>
            <p>Intentando reconectar...</p>
          </div>
        ) : (
          <div className="reconnect-message">
            <p>
              La partida está tardando en cargar. 
              {isNearMaxRetries && " Estamos teniendo problemas para conectar."}
            </p>
            {attemptCount > 0 && (
              <span className="attempts-counter">
                Intento {attemptCount} de {maxAttempts}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="reconnect-actions">
        <button 
          onClick={handleForceRefresh} 
          className="reconnect-button"
          disabled={isLoading}
        >
          Forzar Actualización
        </button>
        
        <button 
          onClick={handleRetry}
          className="reconnect-button secondary"
          disabled={isLoading || attemptCount >= maxAttempts}
        >
          Reintentar Conexión
        </button>
        
        <button 
          onClick={handleBackToRooms}
          className="cancel-button"
        >
          Volver a Salas
        </button>
      </div>

      {/* Advanced options toggle */}
      <div className="advanced-options-toggle" onClick={toggleAdvanced}>
        {isAdvancedOpen ? '▲ Ocultar opciones avanzadas' : '▼ Mostrar opciones avanzadas'}
      </div>
      
      {/* Advanced options */}
      {isAdvancedOpen && (
        <div className="advanced-options">
          <button 
            onClick={handleRestart} 
            className="advanced-button restart"
          >
            Reiniciar Aplicación
          </button>
          
          <button 
            onClick={() => socket?.disconnect()} 
            className="advanced-button disconnect"
          >
            Desconectar Socket
          </button>
          
          <button 
            onClick={handleViewDebug} 
            className="advanced-button debug"
          >
            Ver Diagnostico
          </button>
        </div>
      )}

      {/* Diagnostic info display */}
      <div className="diagnostic-info">
        <h3>Información de Diagnóstico</h3>
        <p>Estado del Socket: {diagnosticInfo.socketConnected ? 'Conectado' : 'Desconectado'}</p>
        <p>Conexión a Internet: {diagnosticInfo.internetConnected ? 'Disponible' : 'No disponible'}</p>
        <p>Servidor Alcanzable: {diagnosticInfo.serverReachable ? 'Sí' : 'No'}</p>
        <p>Última Verificación: {new Date(diagnosticInfo.lastCheckTime).toLocaleTimeString()}</p>
        
        <button 
          onClick={runDiagnostics} 
          className="diagnostic-button"
          disabled={isRunningDiagnostic}
        >
          {isRunningDiagnostic ? 'Ejecutando Diagnóstico...' : 'Ejecutar Diagnóstico de Red'}
        </button>
      </div>
    </div>
  );
};

export default GameReconnectOptions;
