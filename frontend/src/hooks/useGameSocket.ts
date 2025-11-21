import { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom'; // ✅ Removido - la navegación se maneja desde el componente
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
  jugadoresQueHanDeclarado?: number[]; // ✅ Agregado
  maxPuntosDeclaradosInfo?: { // ✅ Agregado
    puntos: number;
    jugadorId: number | null;
    equipoId: number | null;
  };
  equipoConLaIniciativaId?: number | null; // ✅ Agregado
  equipoRespondedorCantoId?: number | null; // ✅ Agregado
  puedeDeclararSonBuenas?: boolean; // ✅ Agregado
  declaracionEnCurso?: boolean; // ✅ Agregado
  jugadorTurnoDeclararPuntosId?: number | null; // ✅ Agregado
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
  ordenJugadoresRonda: Array<{
    id: number;
    nombreUsuario: string;
    equipoId: number;
  }>;
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
  // ✅ Nuevos campos para abandono
  motivoFinalizacion?: string;
  tipoFinalizacion?: string;
  jugadorQueAbandonoId?: number;
  equipoGanador?: number;
}

interface UseGameSocketReturn {
  socket: Socket | null;
  gameState: EstadoJuego | null;
  jugadorId: number | null;
  error: string | null;
  isLoading: boolean;
  reconnectAttempts: number;
  loadingTimeoutActive: boolean;
  shouldRedirectToLogin: boolean; // ✅ Nuevo campo para manejar redirección
  // Action functions
  jugarCarta: (carta: Carta) => void;
  cantar: (tipoCanto: string) => void;
  responderCanto: (respuesta: string) => void;
  declararPuntosEnvido: (puntos: number) => void;
  declararSonBuenas: () => void;
  irseAlMazo: () => void;
  abandonarPartida: () => void; // ✅ Nueva función para abandonar partida
  requestGameState: () => void;
  retryConnection: () => void;
  clearRedirectFlag: () => void; // ✅ Función para limpiar la flag de redirección
}

// 🔥 Flag global para detectar React Dev Mode y evitar cleanup múltiple
let reactDevModeCleanupCount = 0;
let lastCleanupTime = 0;
let cleanupTimeoutId: NodeJS.Timeout | null = null; // Para debounce del cleanup
let isFirstMount = true; // Flag para detectar primer mount

export function useGameSocket(codigoSala: string | undefined): UseGameSocketReturn {
  const [gameState, setGameState] = useState<EstadoJuego | null>(null);
  const [jugadorId, setJugadorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [loadingTimeoutActive, setLoadingTimeoutActive] = useState(false);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false); // ✅ Nueva flag
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const estadoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoReconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false); // Flag para evitar múltiples conexiones
  const isCleaningUpRef = useRef(false); // Flag para evitar cleanup innecesario
  const currentRoomRef = useRef<string | null>(null); // Track current room
  const hasConnectedOnceRef = useRef(false); // Flag para evitar cleanup en primera conexión
  
  const maxReconnectAttempts = 5;
  const initialLoadTimeout = 15000; // 15 segundos para timeout inicial
  const SERVER_URL = process.env.VITE_API_URL || 'http://localhost:3001';

  // ✅ Función para limpiar timeouts - sin dependencias para evitar recreación
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
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }
  }, []); // Sin dependencias para evitar recreación

  // ✅ Función robusta para solicitar estado del juego - mejorada para evitar dependencias problemáticas
  const requestGameState = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('[CLIENT] 🔌 Socket no conectado para solicitar estado.');
      
      // Verificar si tenemos estado en localStorage como backup
      if (codigoSala) {
        try {
          const savedState = localStorage.getItem(`gameState_${codigoSala}`);
          if (savedState) {
            const backupState = JSON.parse(savedState);
            console.log('[CLIENT] 📦 Usando estado de backup durante desconexión');
            setGameState(backupState);
            setIsLoading(false);
            setError('Usando datos guardados. Intentando reconectar...');
            gamePerformanceMonitor.trackCacheHit('localStorage');
          }
        } catch (e) {
          console.error('[CLIENT] Error recuperando estado de localStorage:', e);
        }
      }
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
      // Usar closure para verificar estado actual
      setGameState(currentGameState => {
        if (!currentGameState) {
          console.log('[CLIENT] ⏱️ Timeout esperando estado del servidor');
          setError('El servidor no respondió a tiempo. Verifica tu conexión.');
          setIsLoading(false);
          setLoadingTimeoutActive(true);
          
          // Intentar con estado de backup
          if (codigoSala) {
            try {
              const savedState = localStorage.getItem(`gameState_${codigoSala}`);
              if (savedState) {
                const backupState = JSON.parse(savedState);
                console.log('[CLIENT] 🔄 Usando estado de backup tras timeout');
                setError('Usando datos guardados. Conexión lenta detectada.');
                setLoadingTimeoutActive(false);
                gamePerformanceMonitor.trackCacheHit('localStorage');
                return backupState;
              }
            } catch (e) {
              console.error('[CLIENT] Error recuperando estado de backup:', e);
            }
          }
        }
        return currentGameState;
      });
    }, initialLoadTimeout);
  }, [codigoSala, initialLoadTimeout]); // Solo dependencias realmente necesarias

  // ✅ Función de reconexión mejorada - sin dependencias que causen recreación
  const retryConnection = useCallback(() => {
    // Usar closure para obtener el valor actual de reconnectAttempts
    setReconnectAttempts(currentAttempts => {
      if (currentAttempts >= maxReconnectAttempts) {
        console.log('[CLIENT] ⚠️ Máximos intentos de reconexión alcanzados');
        setError('No se pudo conectar después de varios intentos. Intenta volver a las salas.');
        setLoadingTimeoutActive(true);
        gamePerformanceMonitor.trackRecoveryAttempt('max_attempts_reached');
        return currentAttempts;
      }

      setLoadingTimeoutActive(false);
      setError(null);
      console.log(`[CLIENT] 🔄 Intento de reconexión ${currentAttempts + 1}/${maxReconnectAttempts}`);
      
      gamePerformanceMonitor.trackRecoveryAttempt(`reconnection_attempt_${currentAttempts + 1}`);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectSocket();
      }, 2000);

      return currentAttempts + 1;
    });
  }, []); // Sin dependencias para evitar recreación

  // ✅ Función principal de conexión del socket - mejorada para evitar recreación
  const connectSocket = useCallback(() => {
    console.log('[CLIENT] 🔍 Debug connectSocket llamado con codigoSala:', codigoSala);
    
    if (!codigoSala) {
      console.error('[CLIENT] ❌ Código de sala no proporcionado o es undefined/null');
      setError('Código de sala no proporcionado.');
      setIsLoading(false);
      return;
    }
    
    // Evitar múltiples conexiones simultáneas
    if (isConnectingRef.current) {
      console.log('[CLIENT] 🔄 Conexión ya en progreso, ignorando nueva solicitud');
      return;
    }
    
    // Evitar reconexión durante cleanup
    if (isCleaningUpRef.current) {
      console.log('[CLIENT] 🧹 Cleanup en progreso, ignorando conexión');
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      console.log('[CLIENT] ✅ Socket ya conectado, verificando sala actual');
      // Si estamos conectados a la misma sala, no reconectar
      if (currentRoomRef.current === codigoSala) {
        console.log('[CLIENT] ✅ Ya conectado a la sala correcta');
        return;
      }
    }

    isConnectingRef.current = true;
    console.log(`[CLIENT] 🔌 Conectando a sala ${codigoSala}...`);
    setIsLoading(true);
    setError(null);
    setLoadingTimeoutActive(false);

    const token = localStorage.getItem('token');
    const anonymous = localStorage.getItem('isAnonymous') === 'true';

    // Desconectar socket existente si está conectado a otra sala
    if (socketRef.current && currentRoomRef.current !== codigoSala) {
      console.log('[CLIENT] 🔄 Desconectando de sala anterior:', currentRoomRef.current);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket: Socket = io(SERVER_URL, {
      query: { codigoSala, token, anonymous },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      autoConnect: false, // Control manual de conexión
      forceNew: true, // Forzar nueva conexión para evitar reutilización de socket
    });

    socketRef.current = newSocket;
    currentRoomRef.current = codigoSala || null;
    newSocket.connect();

    // === EVENTOS DE CONEXIÓN ===
    newSocket.on('connect', () => {
      console.log(`[CLIENT] ✅ Socket conectado: ${newSocket.id}`);
      
      // 🔥 Marcar timestamp de conexión para detectar cleanup inmediato en React Dev Mode
      (newSocket as any).connectedAt = Date.now();
      hasConnectedOnceRef.current = true; // Marcar que ya hemos conectado
      
      isConnectingRef.current = false;
      setReconnectAttempts(0);
      setError(null);

      // Autenticar con token
      const token = localStorage.getItem('token');
      if (token) {
        newSocket.emit('autenticar_socket', token);
      }

      // Cargar estado inicial desde localStorage si existe
      if (codigoSala) {
        try {
          const savedState = localStorage.getItem(`gameState_${codigoSala}`);
          if (savedState) {
            const storedGameState = JSON.parse(savedState);
            console.log('[CLIENT] ✅ Estado recuperado de localStorage');
            setGameState(storedGameState);
            setIsLoading(false);
            gamePerformanceMonitor.trackCacheHit('localStorage');
            // Aún así solicitar estado actualizado del servidor
            setTimeout(() => requestGameState(), 1000);
          }
        } catch (e) {
          console.error('[CLIENT] Error recuperando estado de localStorage:', e);
        }
      }
    });

    // === EVENTOS DE AUTENTICACIÓN ===
    newSocket.on('autenticacion_exitosa', (data) => {
      console.log('[CLIENT] ✅ Socket autenticado:', data);
      console.log('[CLIENT] 🔍 Debug - codigoSala al autenticar:', codigoSala);
      setReconnectAttempts(0);
      setError(null);
      
      if (codigoSala) {
        console.log('[CLIENT] 📡 Emitiendo unirse_sala_juego con código:', codigoSala);
        newSocket.emit('unirse_sala_juego', codigoSala);
      } else {
        console.error('[CLIENT] ❌ No se puede unir a sala: codigoSala es undefined/null');
        setError('Error: Código de sala no disponible para unirse al juego.');
      }
    });

    newSocket.on('autenticacion_fallida', (error) => {
      console.error('[CLIENT] ❌ Error de autenticación:', error);
      isConnectingRef.current = false;
      setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearTimeouts();
      
      // Reintentar autenticación
      setTimeout(() => {
        setReconnectAttempts(currentAttempts => {
          if (currentAttempts < maxReconnectAttempts) {
            console.log('[CLIENT] Reintentando tras fallo de autenticación...');
            retryConnection();
          } else {
            // Marcar para redirigir a login si falla múltiples veces
            setShouldRedirectToLogin(true);
          }
          return currentAttempts;
        });
      }, 3000);
    });

    // === EVENTOS DE SALA ===
    newSocket.on('unido_sala_juego', (data) => {
      console.log('[CLIENT] ✅ Unido a sala:', data);
      setError(null);
      
      // Verificar si ya tenemos estado usando closure
      setGameState(currentState => {
        if (!currentState) {
          console.log('[CLIENT] 📡 Solicitando estado inicial del servidor...');
          setTimeout(() => requestGameState(), 1000);
        }
        return currentState;
      });
    });

    newSocket.on('error_unirse_sala', (error) => {
      console.error('[CLIENT] ❌ Error uniéndose a sala:', error);
      isConnectingRef.current = false;
      setError(`Error uniéndose a la sala: ${error.message || error}`);
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearTimeouts();
      
      setTimeout(() => retryConnection(), 3000);
    });

    // === EVENTOS DE JUEGO ===
    newSocket.on('partida_iniciada', (estadoInicial) => {
      console.log('[CLIENT] 🚀 Partida iniciada:', estadoInicial);
      setGameState(estadoInicial);
      setIsLoading(false);
      setError(null);
      setLoadingTimeoutActive(false);
      clearTimeouts();
      
      // Guardar estado usando closure para evitar dependencias
      if (codigoSala) {
        try {
          localStorage.setItem(`gameState_${codigoSala}`, JSON.stringify(estadoInicial));
          console.log('[CLIENT] 💾 Estado guardado en localStorage');
        } catch (e) {
          console.error('[CLIENT] Error guardando estado:', e);
        }
      }
      gamePerformanceMonitor.trackStateReceived();
    });

    newSocket.on('estado_juego_actualizado', (estado) => {
      console.log('[CLIENT] 🎯 Estado actualizado:', estado);
      
      setIsLoading(false);
      setLoadingTimeoutActive(false);
      clearTimeouts();
      
      const isValidState = estado && 
                          estado.equipos?.length > 0 && 
                          estado.jugadores?.length > 0;
      
      if (estado.estadoPartida === 'error' || !isValidState) {
        const errorMsg = estado.mensajeError || 'Estado de juego incompleto';
        console.error('[CLIENT] ❌ Estado inválido:', errorMsg);
        setError(errorMsg);
        setLoadingTimeoutActive(true);
        gamePerformanceMonitor.trackNetworkError('invalid_game_state');
      } else {
        console.log('[CLIENT] ✅ Estado válido recibido');
        setGameState(estado);
        setError(null);
        setReconnectAttempts(0);
        
        // Guardar estado usando closure
        if (codigoSala) {
          try {
            localStorage.setItem(`gameState_${codigoSala}`, JSON.stringify(estado));
            console.log('[CLIENT] 💾 Estado actualizado guardado en localStorage');
          } catch (e) {
            console.error('[CLIENT] Error guardando estado:', e);
          }
        }
        gamePerformanceMonitor.trackStateReceived();
      }
    });

    newSocket.on('esperando_inicio_partida', (data) => {
      console.log('[CLIENT] ⏳ Esperando inicio:', data);
      setGameState(null);
      setError(null);
    });

    // Manejar "Envido va primero" - retomar truco pendiente
    newSocket.on('retomar_truco_pendiente', (data) => {
      console.log('[CLIENT] 🎯 Retomando truco pendiente por "Envido va primero":', data);
      
      // Mostrar notificación temporal
      const mensaje = 'Envido resuelto. Ahora debes responder al truco pendiente.';
      
      // Podrías agregar aquí una notificación visual específica
      // Por ahora, solo actualizamos el estado del juego
      if (data.trucoState) {
        setGameState(prevState => {
          if (!prevState || !prevState.rondaActual) return prevState;
          
          return {
            ...prevState,
            rondaActual: {
              ...prevState.rondaActual,
              trucoPendientePorEnvidoPrimero: false,
              trucoInfo: {
                ...prevState.rondaActual.trucoInfo,
                ...data.trucoState
              }
            }
          };
        });
      }
      
      // También podrías emitir un evento de notificación personalizada aquí
      console.log('[CLIENT] ✨ Mensaje: ' + mensaje);
    });

    // === EVENTOS DE RECOMPENSAS ===
    newSocket.on('recompensas_partida', (recompensas) => {
      console.log('[CLIENT] 🏆 Recompensas recibidas:', recompensas);
      // Las recompensas se manejan normalmente en el contexto del GameEndModal
      // que las recibe junto con el estado final del juego
    });

    newSocket.on('error_estado_juego', (data) => {
      console.error('[CLIENT] ❌ Error de estado:', data);
      gameStateDebugger.logError('game_state_error', data);
      setError(data.message);
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearTimeouts();
    });

    // === EVENTOS DE DESCONEXIÓN ===
    newSocket.on('disconnect', (reason) => {
      console.log('[CLIENT] 🔌 Socket desconectado:', reason);
      isConnectingRef.current = false;
      
      // Manejo inteligente de desconexión usando closure
      setGameState(currentState => {
        if (currentState) {
          console.log('[CLIENT] 📦 Manteniendo estado durante desconexión');
          setError('Desconectado del servidor. Reintentando conexión...');
          setIsLoading(false);
          return currentState;
        } else {
          // Intentar recuperar estado desde localStorage
          if (codigoSala) {
            try {
              const savedState = localStorage.getItem(`gameState_${codigoSala}`);
              if (savedState) {
                const backupState = JSON.parse(savedState);
                console.log('[CLIENT] 📦 Recuperando estado de backup durante desconexión');
                setError('Desconectado del servidor. Usando datos guardados...');
                setIsLoading(false);
                return backupState;
              }
            } catch (e) {
              console.error('[CLIENT] Error recuperando estado de backup:', e);
            }
          }
          
          setIsLoading(true);
          setError(`Desconectado: ${reason}. Reconectando...`);
          return null;
        }
      });

      // Programar reconexión automática si es necesario
      if (reason !== 'io server disconnect' && reason !== 'transport close') {
        setTimeout(() => {
          if (!newSocket.connected) {
            setReconnectAttempts(currentAttempts => {
              if (currentAttempts < maxReconnectAttempts) {
                retryConnection();
              }
              return currentAttempts;
            });
          }
        }, 3000);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error(`[CLIENT] ❌ Error de conexión: ${err.message}`);
      isConnectingRef.current = false;
      setError(`Error de conexión: ${err.message}`);
      
      // Usar estado de backup si existe
      if (codigoSala) {
        try {
          const savedState = localStorage.getItem(`gameState_${codigoSala}`);
          if (savedState) {
            const backupState = JSON.parse(savedState);
            console.log('[CLIENT] 📦 Usando estado de backup por error de conexión');
            setGameState(backupState);
            setError('Modo offline: usando datos guardados. Reintentando conexión...');
            gamePerformanceMonitor.trackCacheHit('localStorage');
          }
        } catch (e) {
          console.error('[CLIENT] Error recuperando estado de backup:', e);
        }
      }
      
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      clearTimeouts();
      
      // Programar reintento de conexión
      setTimeout(() => {
        if (newSocket.disconnected) {
          retryConnection();
        }
      }, 3000);
    });

    // Timeout de emergencia para evitar carga infinita
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn('[CLIENT] ⚠️ Timeout de emergencia activado');
      isConnectingRef.current = false;
      
      gamePerformanceMonitor.trackLoadingTimeout(initialLoadTimeout);
      
      // Intentar usar backup state sin dependencias
      if (codigoSala) {
        try {
          const savedState = localStorage.getItem(`gameState_${codigoSala}`);
          if (savedState) {
            const backupState = JSON.parse(savedState);
            console.log('[CLIENT] 🔄 Usando estado de backup por timeout de emergencia');
            setGameState(backupState);
            setIsLoading(false);
            setError('Usando estado guardado. Conexión lenta detectada.');
            setLoadingTimeoutActive(false);
            gamePerformanceMonitor.trackCacheHit('localStorage');
            gamePerformanceMonitor.trackInfiniteLoadingPrevented();
            return;
          }
        } catch (e) {
          console.error('[CLIENT] Error recuperando estado de backup:', e);
        }
      }
      
      setIsLoading(false);
      setLoadingTimeoutActive(true);
      setError('Tiempo de conexión agotado. No se pudo cargar el juego.');
    }, initialLoadTimeout);

    // Cleanup de timeout de emergencia se maneja automáticamente
    // cuando se actualiza el estado en los event listeners

  }, [codigoSala]); // Solo codigoSala como dependencia clave

  // Determinar el jugador actual basado en el token - sin dependencias problemáticas
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No estás autenticado. Por favor, inicia sesión.');
      setShouldRedirectToLogin(true);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setJugadorId(payload.id);
      
      // Intentar cargar estado guardado al inicio
      if (codigoSala) {
        try {
          const savedState = localStorage.getItem(`gameState_${codigoSala}`);
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            console.log('[CLIENT] 🔄 Cargando estado previo desde localStorage');
            setGameState(parsedState);
            setIsLoading(false);
            gamePerformanceMonitor.trackCacheHit('localStorage');
            gamePerformanceMonitor.trackInfiniteLoadingPrevented();
          }
        } catch (e) {
          console.error('[CLIENT] Error recuperando estado de localStorage:', e);
        }
      }
      
      gameStateDebugger.logAction('user_identified', { userId: payload.id });
    } catch (error) {
      gameStateDebugger.logError('Error al decodificar token', error);
      setError('Error al identificar usuario. Por favor, inicia sesión nuevamente.');
      setShouldRedirectToLogin(true);
    }
  }, [codigoSala]); // Solo dependencias realmente necesarias

  // Inicializar conexión socket cuando esté disponible el código de sala - mejorado
  useEffect(() => {
    console.log('[CLIENT] 🔄 useEffect ejecutado con codigoSala:', codigoSala);
    console.log('[CLIENT] 🔍 isFirstMount:', isFirstMount);
    
    // Si es el mismo room y ya tenemos conexión, no hacer nada
    if (codigoSala && currentRoomRef.current === codigoSala && socketRef.current?.connected) {
      console.log('[CLIENT] ✅ Ya conectado a esta sala, saltando reconexión');
      return;
    }
    
    // Actualizar room actual
    currentRoomRef.current = codigoSala || null;
    
    if (codigoSala && !isCleaningUpRef.current) {
      console.log('[CLIENT] 🚀 Iniciando conexión para sala:', codigoSala);
      connectSocket();
    }

    return () => {
      console.log('[CLIENT] 🧹 Cleanup del hook useGameSocket para sala:', codigoSala);
      console.log('[CLIENT] 🔍 isFirstMount en cleanup:', isFirstMount);
      
      // 🔥 EVITAR CLEANUP EN PRIMER MOUNT (REACT STRICT MODE)
      if (isFirstMount && import.meta.env.DEV) {
        console.log('[CLIENT] 🔄 Primer mount en React Dev Mode - evitando cleanup');
        isFirstMount = false; // Marcar que ya no es el primer mount
        return;
      }
      
      // 🔥 DEBOUNCE CLEANUP PARA REACT DEV MODE
      if (cleanupTimeoutId) {
        console.log('[CLIENT] 🔄 Cleanup anterior cancelado (debounce)');
        clearTimeout(cleanupTimeoutId);
        cleanupTimeoutId = null;
      }
      
      const isReactDevMode = import.meta.env.DEV;
      const now = Date.now();
      const connectionAge = socketRef.current ? now - (socketRef.current as any).connectedAt : 0;
      const timeSinceLastCleanup = now - lastCleanupTime;
      
      console.log('[CLIENT] 🔍 Cleanup check:', {
        isReactDevMode,
        connectionAge,
        socketConnected: socketRef.current?.connected,
        currentRoom: currentRoomRef.current,
        paramRoom: codigoSala,
        hasConnectedOnce: hasConnectedOnceRef.current,
        cleanupCount: reactDevModeCleanupCount,
        timeSinceLastCleanup
      });
      
      // Detectar múltiples cleanups rápidos (típico de React Dev Mode)
      if (isReactDevMode && timeSinceLastCleanup < 1000) {
        reactDevModeCleanupCount++;
        console.log('[CLIENT] 🔄 Múltiples cleanups detectados en Dev Mode, count:', reactDevModeCleanupCount);
        
        // Si es el primer cleanup rápido y tenemos conexión activa, usar debounce
        if (reactDevModeCleanupCount === 1 && socketRef.current?.connected) {
          console.log('[CLIENT] 🔄 Debouncing cleanup para evitar desconexión inmediata');
          
          cleanupTimeoutId = setTimeout(() => {
            console.log('[CLIENT] ⏰ Ejecutando cleanup después de debounce');
            performCleanup();
            cleanupTimeoutId = null;
          }, 500); // Esperar 500ms antes de cleanup real
          
          lastCleanupTime = now;
          return;
        }
      } else {
        // Reset counter si ha pasado suficiente tiempo
        reactDevModeCleanupCount = 0;
      }
      
      lastCleanupTime = now;
      
      // Solo hacer cleanup si realmente estamos cambiando de sala o desmontando
      const isRoomChange = currentRoomRef.current !== codigoSala;
      const shouldCleanup = isRoomChange || !codigoSala;
      
      if (shouldCleanup) {
        console.log('[CLIENT] 🔄 Ejecutando cleanup inmediato');
        performCleanup();
      } else {
        console.log('[CLIENT] ⏭️ Saltando cleanup - misma sala');
      }
      
      function performCleanup() {
        isCleaningUpRef.current = true;
        clearTimeouts();
        
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        
        isConnectingRef.current = false;
        currentRoomRef.current = null;
        hasConnectedOnceRef.current = false;
        
        // Reset cleanup flag after a delay
        setTimeout(() => {
          isCleaningUpRef.current = false;
        }, 100);
      }
    };
  }, [codigoSala]); // Solo codigoSala como dependencia

  // === FUNCIONES DE ACCIÓN DEL JUEGO ===
  const jugarCarta = useCallback((carta: Carta) => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] 🃏 Jugando carta:', carta);
    socketRef.current.emit('jugar_carta_ws', { carta });
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  const cantar = useCallback((tipoCanto: string) => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] 🎵 Cantando:', tipoCanto);
    socketRef.current.emit('cantar_ws', { canto: tipoCanto });
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  const responderCanto = useCallback((respuesta: string) => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] 💬 Respondiendo canto:', respuesta);
    socketRef.current.emit('responder_canto_ws', { respuesta });
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  const declararPuntosEnvido = useCallback((puntos: number) => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] 🔢 Declarando puntos de envido:', puntos);
    socketRef.current.emit('declarar_puntos_envido_ws', { puntos });
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  const declararSonBuenas = useCallback(() => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] ✅ Declarando "son buenas"');
    socketRef.current.emit('declarar_son_buenas_ws');
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  const irseAlMazo = useCallback(() => {
    if (!socketRef.current || esperandoRespuesta) return;
    
    setEsperandoRespuesta(true);
    console.log('[CLIENT] 🏃 Yéndose al mazo');
    socketRef.current.emit('irse_al_mazo_ws');
    
    setTimeout(() => setEsperandoRespuesta(false), 1000);
  }, [esperandoRespuesta]);

  // ✅ Nueva función para abandonar partida
  const abandonarPartida = useCallback(() => {
    if (!socketRef.current) return;
    
    console.log('[CLIENT] 🚪 Abandonando partida');
    socketRef.current.emit('abandonar_partida_ws');
    
    // NO navegar desde aquí - dejar que el componente padre lo maneje
    // La navegación se debe hacer desde el componente que usa este hook
  }, []); // Sin navigate como dependencia

  // ✅ Función para limpiar la flag de redirección
  const clearRedirectFlag = useCallback(() => {
    setShouldRedirectToLogin(false);
  }, []);

  return {
    socket: socketRef.current,
    gameState,
    jugadorId,
    error,
    isLoading,
    reconnectAttempts,
    loadingTimeoutActive,
    shouldRedirectToLogin, // ✅ Nueva propiedad
    jugarCarta,
    cantar,
    responderCanto,
    declararPuntosEnvido,
    declararSonBuenas,
    irseAlMazo,
    abandonarPartida, // ✅ Agregar la nueva función
    requestGameState,
    retryConnection,
    clearRedirectFlag, // ✅ Nueva función
  };
}
