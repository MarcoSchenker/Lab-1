import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import gameStateDebugger from '../utils/gameStateDebugger';
import { gamePerformanceMonitor } from '../utils/gamePerformanceMonitor';

// Interfaces para el estado del juego
interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

interface Jugador {
  id: number;
  nombreUsuario: string;
  equipoId: number;
  esPie: boolean;
  cartasMano: Carta[] | null;
  cartasJugadasRonda: Carta[];
  estadoConexion: string;
  skinPreferida?: string;
}

interface Equipo {
  id: number;
  nombre: string;
  puntosPartida: number;
  jugadoresIds: number[];
}

interface EstadoEnvido {
  cantado: boolean;
  querido: boolean;
  nivelActual: string;
  estadoResolucion: string;
  cantadoPorJugadorId: number | null;
  cantadoPorEquipoId: number | null;
  puntosEnJuego: number;
  equipoGanadorId: number | null;
  puntosDeclarados: Record<number, number>;
}

interface EstadoTruco {
  cantado: boolean;
  querido: boolean;
  nivelActual: string;
  puntosEnJuego: number;
  cantadoPorJugadorId: number | null;
  cantadoPorEquipoId: number | null;
  estadoResolucion: string;
  equipoDebeResponderTrucoId: number | null;
  jugadorTurnoAlMomentoDelCantoId: number | null;
}

interface EstadoRonda {
  numeroRonda: number;
  jugadorManoId: number | null;
  ganadorRondaEquipoId: number | null;
  turnoInfo: {
    jugadorTurnoActualId: number | null;
    manoActualNumero: number;
    cartasEnMesaManoActual: { jugadorId: number; carta: Carta }[];
    manosJugadas: Array<{
      jugadas: { jugadorId: number; carta: Carta }[];
      ganadorManoJugadorId: number | null;
      fueParda: boolean;
    }>;
  };
  envidoInfo: EstadoEnvido;
  trucoInfo: EstadoTruco;
  trucoPendientePorEnvidoPrimero: boolean;
}

interface EstadoJuego {
  codigoSala: string;
  tipoPartida: string;
  puntosVictoria: number;
  estadoPartida: string;
  mensajeError?: string;
  equipos: Equipo[];
  jugadores: Jugador[];
  numeroRondaActual: number;
  indiceJugadorManoGlobal: number;
  rondaActual: EstadoRonda;
  historialRondas: any[];
}

interface UseGameSocketReturn {
  socket: Socket | null;
  gameState: EstadoJuego | null;
  jugadorId: number | null;
  error: string | null;
  isLoading: boolean;
  reconnectAttempts: number;
  loadingTimeoutActive: boolean; // ✅ Nuevo estado para timeout de carga
  // Action functions
  jugarCarta: (carta: Carta) => void;
  cantar: (tipoCanto: string) => void;
  responderCanto: (respuesta: string) => void;
  declararPuntosEnvido: (puntos: number) => void;
  declararSonBuenas: () => void;
  irseAlMazo: () => void;
  requestGameState: () => void;
  retryConnection: () => void;
}

export function useGameSocket(codigoSala: string | undefined): UseGameSocketReturn {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<EstadoJuego | null>(null);
  const [jugadorId, setJugadorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [loadingTimeoutActive, setLoadingTimeoutActive] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const estadoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoReconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxReconnectAttempts = 5;
  const initialLoadTimeout = 15000; // 15 segundos para timeout inicial
  const SERVER_URL = 'http://localhost:3001';

  // ✅ Función para limpiar timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (autoReconnectIntervalRef.current) {
      clearInterval(autoReconnectIntervalRef.current);
      autoReconnectIntervalRef.current = null;
    }
    if (estadoTimeoutRef.current) {
      clearTimeout(estadoTimeoutRef.current);
      estadoTimeoutRef.current = null;
    }
  }, []);

  // ✅ Función para cargar estado desde localStorage
  const loadSavedState = useCallback(() => {
    if (!codigoSala) return null;
    
    try {
      const savedState = localStorage.getItem(`gameState_${codigoSala}`);
      if (savedState) {
        console.log('[CLIENT] 📦 Recuperando estado guardado de localStorage');
        return JSON.parse(savedState);
      }
    } catch (e) {
      console.error('[CLIENT] Error recuperando estado de localStorage:', e);
    }
    return null;
  }, [codigoSala]);

  // ✅ Función para guardar estado en localStorage
  const saveStateToLocalStorage = useCallback((estado: EstadoJuego) => {
    if (!codigoSala) return;
    
    try {
      console.log('[CLIENT] 💾 Guardando estado en localStorage');
      localStorage.setItem(`gameState_${codigoSala}`, JSON.stringify(estado));
    } catch (e) {
      console.error('[CLIENT] Error guardando estado en localStorage:', e);
    }
  }, [codigoSala]);

  // Determinar el jugador actual basado en el token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No estás autenticado. Por favor, inicia sesión.');
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setJugadorId(payload.id);
      
      // ✅ Intentar cargar estado guardado al inicio
      const savedState = loadSavedState();
      if (savedState) {
        console.log('[CLIENT] 🔄 Cargando estado previo desde localStorage');
        setGameState(savedState);
        setIsLoading(false);
        gamePerformanceMonitor.trackCacheHit('localStorage');
        gamePerformanceMonitor.trackInfiniteLoadingPrevented();
      }
      
      gameStateDebugger.logAction('user_identified', { userId: payload.id });
    } catch (error) {
      gameStateDebugger.logError('Error al decodificar token', error);
      setError('Error al identificar usuario. Por favor, inicia sesión nuevamente.');
      navigate('/login');
    }
  }, [navigate, loadSavedState]);

  // ✅ Mejorado: Retry connection function with immediate state request
  const retryConnection = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('[CLIENT] ⚠️ Máximos intentos de reconexión alcanzados');
      setError('No se pudo conectar después de varios intentos. Intenta volver a las salas.');
      setLoadingTimeoutActive(true); // ✅ Activar timeout al alcanzar max intentos
      gamePerformanceMonitor.trackRecoveryAttempt('max_attempts_reached');
      return Promise.reject('Max attempts reached');
    }

    // ✅ Resetear estados de timeout al intentar reconectar
    setLoadingTimeoutActive(false);
    setError(null);
    setReconnectAttempts(prev => prev + 1);
    console.log(`[CLIENT] 🔄 Intento de reconexión ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
    
    // ✅ Track recovery attempt
    gamePerformanceMonitor.trackRecoveryAttempt(`reconnection_attempt_${reconnectAttempts + 1}`);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    return new Promise<void>((resolve) => {
      reconnectTimeoutRef.current = setTimeout(() => {
        initializeSocket();
        resolve();
      }, 2000);
    });
  }, [reconnectAttempts]);

  // ✅ Mejorado: Request game state function con retry automático y manejo de timeout
  const requestGameState = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('[CLIENT] 🔌 Socket no conectado para solicitar estado. Intentando reconectar...');
      
      // Verificar si tenemos estado en localStorage primero
      const backupState = loadSavedState();
      if (backupState) {
        console.log('[CLIENT] 📦 Usando estado de backup durante reconexión');
        setGameState(backupState);
        setIsLoading(false);
        setError('Usando datos guardados. Reconectando...');
      }
      
      // Intentar reconectar
      retryConnection().then(() => {
        setTimeout(() => {
          if (socketRef.current?.connected) {
            console.log('[CLIENT] 🎮 Socket reconectado, solicitando estado...');
            socketRef.current.emit('solicitar_estado_juego_ws');
          }
        }, 1500); // Dar más tiempo para la reconexión
      }).catch(err => {
        console.log('[CLIENT] Error reconectando:', err);
        setError('Error de reconexión. Intenta recargar la página.');
      });
      
      return;
    }
    
    console.log('[CLIENT] 🎮 Solicitando estado del juego...');
    socketRef.current.emit('solicitar_estado_juego_ws');
    
    // Limpiar timeout anterior si existe
    if (estadoTimeoutRef.current) {
      clearTimeout(estadoTimeoutRef.current);
      estadoTimeoutRef.current = null;
    }
    
    // Establecer timeout para respuesta del servidor
    estadoTimeoutRef.current = setTimeout(() => {
      if (!gameState) {
        console.log('[CLIENT] ⏱️ Timeout esperando estado del servidor');
        setError('El servidor no respondió a tiempo. Verifica tu conexión.');
        setIsLoading(false);
        setLoadingTimeoutActive(true); // ✅ Activar indicador de timeout
        
        // Después del timeout, intentar reconectar automáticamente
        setTimeout(() => {
          if (!gameState && socketRef.current?.disconnected) {
            console.log('[CLIENT] 🔄 Intentando reconexión automática tras timeout...');
            retryConnection();
          }
        }, 2000);
      }
    }, 8000); // Reducir timeout a 8 segundos para respuesta más rápida
  }, [gameState, retryConnection]);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!codigoSala || !jugadorId) {
      console.log('[CLIENT] Falta código de sala o ID de jugador para conectar');
      setIsLoading(false);
      return;
    }

    console.log("[CLIENT] Conectando socket para sala:", codigoSala);
    setIsLoading(true);
    setError(null);

    // ✅ Track socket connection start time for performance monitoring
    const socketStartTime = Date.now();

    // ✅ Timeout de emergencia mejorado para evitar carga infinita
    const emergencyTimeout = setTimeout(() => {
      console.warn('[CLIENT] ⚠️ Timeout de emergencia activado - No se recibió estado');
      
      // ✅ Track loading timeout for monitoring
      gamePerformanceMonitor.trackLoadingTimeout(15000);
      
      // Verificar si ya tenemos un estado en localStorage como backup
      const backupState = loadSavedState();
      if (backupState) {
        console.log('[CLIENT] 🔄 Usando estado de backup desde localStorage');
        setGameState(backupState);
        setIsLoading(false);
        setError('Usando estado guardado. Conexión lenta detectada.');
        setLoadingTimeoutActive(false); // ✅ Resetear timeout si se encontró backup
        gamePerformanceMonitor.trackCacheHit('localStorage');
        gamePerformanceMonitor.trackInfiniteLoadingPrevented();
      } else {
        setIsLoading(false);
        setLoadingTimeoutActive(true); // ✅ Activar timeout si no hay backup
        setError('Tiempo de conexión agotado. No se pudo cargar el juego.');
      }
    }, 15000); // 15 segundos para emergency timeout

    const socket = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    socketRef.current = socket;

    // Limpiar timeout de emergencia cuando el estado se actualice
    const clearEmergencyTimeout = () => {
      if (emergencyTimeout) {
        clearTimeout(emergencyTimeout);
      }
    };

    // Connection events
    socket.on('connect', () => {
      const connectionTime = Date.now() - socketStartTime;
      console.log('[CLIENT] Socket conectado:', socket.id);
      setIsLoading(true);
      
      // ✅ Track connection time
      gamePerformanceMonitor.trackConnectionTime(connectionTime);
      
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('autenticar_socket', token);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[CLIENT] Error de conexión:', error);
      
      // ✅ Track network error
      gamePerformanceMonitor.trackNetworkError('connection_error');
      
      // ✅ En caso de error de conexión, verificar localStorage
      const backupState = loadSavedState();
      if (backupState) {
        console.log('[CLIENT] 📦 Usando estado de backup por error de conexión');
        setGameState(backupState);
        setError('Modo offline: usando datos guardados. Reintentando conexión...');
        gamePerformanceMonitor.trackCacheHit('localStorage');
      } else {
        setError('Error de conexión al servidor');
      }
      
      setIsLoading(false);
      clearEmergencyTimeout();
      
      // Programar reintento de conexión
      setTimeout(() => {
        if (socketRef.current?.disconnected) {
          retryConnection();
        }
      }, 3000);
    });

    // Authentication events
    socket.on('autenticacion_exitosa', (data) => {
      console.log('[CLIENT] Socket autenticado:', data);
      // Resetear contadores de reconexión al autenticar exitosamente
      setReconnectAttempts(0);
      setError(null);
      socket.emit('unirse_sala_juego', codigoSala);
    });

    socket.on('autenticacion_fallida', (error) => {
      console.error('[CLIENT] Error de autenticación:', error);
      setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearEmergencyTimeout();
      
      // Si falla la autenticación, intentar reconectar después de un tiempo
      setTimeout(() => {
        if (reconnectAttempts < maxReconnectAttempts) {
          console.log('[CLIENT] Reintentando tras fallo de autenticación...');
          retryConnection();
        }
      }, 3000);
    });

    // Room events
    socket.on('unido_sala_juego', (data) => {
      console.log('[CLIENT] Unido a sala:', data);
      setError(null); // Limpiar errores al unirse exitosamente
      
      // ✅ Verificar si ya tenemos estado en localStorage antes de solicitar
      const existingState = loadSavedState();
      if (existingState) {
        console.log('[CLIENT] 📦 Estado encontrado en localStorage, usando como base');
        setGameState(existingState);
        setIsLoading(false);
        setLoadingTimeoutActive(false);
        clearEmergencyTimeout();
        
        // Aún así solicitar estado actualizado del servidor para sincronizar
        setTimeout(() => {
          requestGameState();
        }, 1000);
      } else {
        // Si no hay estado guardado, solicitar inmediatamente
        console.log('[CLIENT] 📡 No hay estado local, solicitando del servidor...');
        setTimeout(() => {
          requestGameState();
        }, 1000);
      }
    });

    socket.on('error_unirse_sala', (error) => {
      console.error('[CLIENT] Error uniéndose a sala:', error);
      setError(`Error uniéndose a la sala: ${error.message || error}`);
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearEmergencyTimeout();
      
      // Intentar reconectar después de un error de sala
      setTimeout(() => {
        retryConnection();
      }, 3000);
    });

    // Game events - NEW WebSocket flow
    socket.on('partida_iniciada', (data) => {
      console.log('[CLIENT] 🎮 Partida iniciada:', data);
      gameStateDebugger.logAction('partida_iniciada_received', data);
      
      setTimeout(() => {
        if (socketRef.current?.connected) {
          console.log('[CLIENT] Solicitando estado inicial...');
          socketRef.current.emit('solicitar_estado_inicial');
        }
      }, 500);
    });

    // ✅ Mejora: manejar estado del juego y guardarlo en localStorage
    socket.on('estado_juego_actualizado', (estado) => {
      console.log('[CLIENT] 🎯 Estado recibido:', estado);
      
      // ✅ Track performance metrics
      gamePerformanceMonitor.trackStateReceived();
      
      setIsLoading(false);
      setLoadingTimeoutActive(false); // ✅ Resetear timeout al recibir estado
      clearEmergencyTimeout();
      
      if (estadoTimeoutRef.current) {
        clearTimeout(estadoTimeoutRef.current);
        estadoTimeoutRef.current = null;
      }
    
      const isValidState = estado && 
                          estado.equipos?.length > 0 && 
                          estado.jugadores?.length > 0;
      
      if (estado.estadoPartida === 'error' || !isValidState) {
        const errorMsg = estado.mensajeError || 'Estado de juego incompleto';
        console.error('[CLIENT] ❌ Estado inválido:', errorMsg);
        setError(errorMsg);
        setLoadingTimeoutActive(true); // ✅ Activar timeout para estado inválido
        gamePerformanceMonitor.trackNetworkError('invalid_game_state');
      } else {
        console.log('[CLIENT] ✅ Estado válido, actualizando gameState');
        setGameState(estado);
        setError(null);
        setReconnectAttempts(0);
        
        // ✅ Guardar en localStorage para persistencia
        saveStateToLocalStorage(estado);
        gamePerformanceMonitor.trackCacheHit('localStorage');
      }
    });

    socket.on('esperando_inicio_partida', (data) => {
      console.log('[CLIENT] ⏳ Esperando inicio:', data);
      setIsLoading(true);
      
      // Timeout para este estado específico
      const waitingTimeout = setTimeout(() => {
        console.warn('[CLIENT] ⚠️ Timeout esperando inicio de partida');
        setIsLoading(false);
        setError('Tiempo de espera agotado. La partida no ha iniciado.');
      }, 30000); // 30 segundos para esperar inicio
      
      const interval = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('solicitar_estado_juego_ws');
        } else {
          clearInterval(interval);
          clearTimeout(waitingTimeout);
        }
      }, 3000);
      
      socket.once('estado_juego_actualizado', () => {
        clearInterval(interval);
        clearTimeout(waitingTimeout);
      });
    });

    socket.on('error_estado_juego', (data) => {
      console.error('[CLIENT] Error de estado:', data);
      gameStateDebugger.logError('game_state_error', data);
      setError(data.message);
      setIsLoading(false);
      clearEmergencyTimeout();
    });

    socket.on('disconnect', () => {
      console.log('[CLIENT] Socket desconectado');
      
      // ✅ Manejo inteligente de desconexión
      const currentState = gameState || loadSavedState();
      
      if (currentState) {
        // Si tenemos estado (actual o guardado), mantener la UI funcional
        console.log('[CLIENT] 📦 Manteniendo estado durante desconexión');
        setError('Conexión perdida. Reintentando...');
        // NO cambiar isLoading a true si ya tenemos estado válido
        if (!gameState) {
          setGameState(currentState);
          setIsLoading(false);
          setLoadingTimeoutActive(false);
        }
        
        // Intentar reconectar automáticamente después de 2 segundos
        setTimeout(() => {
          if (socketRef.current?.disconnected) {
            console.log('[CLIENT] 🔄 Iniciando reconexión automática tras desconexión...');
            retryConnection();
          }
        }, 2000);
      } else {
        // Si no tenemos estado, mostrar loading durante reconexión
        setIsLoading(true);
        setError('Conexión perdida. Reintentando...');
        
        // Intentar reconectar automáticamente después de 1 segundo
        setTimeout(() => {
          console.log('[CLIENT] 🔄 Iniciando reconexión automática sin estado...');
          retryConnection();
        }, 1000);
      }
      
      clearEmergencyTimeout();
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('autenticacion_exitosa');
      socket.off('autenticacion_fallida');
      socket.off('unido_sala_juego');
      socket.off('partida_iniciada');
      socket.off('estado_juego_actualizado');
      socket.off('esperando_inicio_partida');
      socket.off('error_estado_juego');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [codigoSala, jugadorId, retryConnection, requestGameState, saveStateToLocalStorage]);

  // ✅ Auto-reconnection interval effect - solicitar estado periódicamente cuando no hay gameState
  useEffect(() => {
    if (!codigoSala || !jugadorId) return;
    
    // Solo activar auto-reconexión si no tenemos estado válido
    if (!gameState && socketRef.current?.connected) {
      console.log('[CLIENT] 🔄 Iniciando auto-reconexión periódica');
      
      autoReconnectIntervalRef.current = setInterval(() => {
        if (!gameState && socketRef.current?.connected) {
          console.log('[CLIENT] 🔄 Auto-reconexión: solicitando estado...');
          requestGameState();
        } else if (gameState) {
          // Si ya tenemos estado, limpiar el intervalo
          if (autoReconnectIntervalRef.current) {
            clearInterval(autoReconnectIntervalRef.current);
            autoReconnectIntervalRef.current = null;
            console.log('[CLIENT] ✅ Auto-reconexión detenida: estado obtenido');
          }
        }
      }, 5000); // Cada 5 segundos
    }
    
    return () => {
      if (autoReconnectIntervalRef.current) {
        clearInterval(autoReconnectIntervalRef.current);
        autoReconnectIntervalRef.current = null;
      }
    };
  }, [codigoSala, jugadorId, gameState, requestGameState]);

  // Initialize socket when we have all required data
  useEffect(() => {
    if (codigoSala && jugadorId && !socketRef.current) {
      // ✅ Track game start for performance monitoring
      gamePerformanceMonitor.trackGameStart();
      initializeSocket();
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (estadoTimeoutRef.current) clearTimeout(estadoTimeoutRef.current);
      if (autoReconnectIntervalRef.current) clearInterval(autoReconnectIntervalRef.current);
    };
  }, [codigoSala, jugadorId, initializeSocket]);

  // Game action functions
  const jugarCarta = useCallback((carta: Carta) => {
    if (!socketRef.current || esperandoRespuesta) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('jugar_carta_ws', { carta });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  }, [esperandoRespuesta]);

  const cantar = useCallback((tipoCanto: string) => {
    if (!socketRef.current || esperandoRespuesta) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cantar_ws', { tipo_canto: tipoCanto });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  }, [esperandoRespuesta]);

  const responderCanto = useCallback((respuesta: string) => {
    if (!socketRef.current || esperandoRespuesta) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta, 
      canto_respondido_tipo: gameState?.rondaActual.envidoInfo.cantado ? 'ENVIDO' : 'TRUCO' 
    });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  }, [esperandoRespuesta, gameState]);

  const declararPuntosEnvido = useCallback((puntos: number) => {
    if (!socketRef.current || esperandoRespuesta) return;
    if (isNaN(puntos) || puntos < 0 || puntos > 33) {
      setError('Puntos de envido inválidos (0-33)');
      return;
    }
    
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta: puntos,
      canto_respondido_tipo: 'ENVIDO'
    });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  }, [esperandoRespuesta]);

  const declararSonBuenas = useCallback(() => {
    if (!socketRef.current || esperandoRespuesta) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta: 'SON_BUENAS_ENVIDO',
      canto_respondido_tipo: 'ENVIDO'
    });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  }, [esperandoRespuesta]);

  const irseAlMazo = useCallback(() => {
    if (!socketRef.current || esperandoRespuesta) return;
    if (window.confirm('¿Estás seguro de que quieres irte al mazo?')) {
      socketRef.current.emit('irse_al_mazo_ws');
    }
  }, [esperandoRespuesta]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log('[CLIENT] 🧹 Limpiando recursos del hook useGameSocket');
      
      // Limpiar todos los timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (estadoTimeoutRef.current) {
        clearTimeout(estadoTimeoutRef.current);
      }
      if (autoReconnectIntervalRef.current) {
        clearInterval(autoReconnectIntervalRef.current);
      }
      
      // Desconectar socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Reset states
      setIsLoading(false);
      setError(null);
    };
  }, []);

  return {
    socket: socketRef.current,
    gameState,
    jugadorId,
    error,
    isLoading,
    reconnectAttempts,
    loadingTimeoutActive, // ✅ Incluir nuevo estado
    jugarCarta,
    cantar,
    responderCanto,
    declararPuntosEnvido,
    declararSonBuenas,
    irseAlMazo,
    requestGameState,
    retryConnection
  };
}
