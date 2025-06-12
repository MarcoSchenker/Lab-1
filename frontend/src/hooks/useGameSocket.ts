import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import gameStateDebugger from '../utils/gameStateDebugger';

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
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const estadoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxReconnectAttempts = 5;

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
      gameStateDebugger.logAction('user_identified', { userId: payload.id });
    } catch (error) {
      gameStateDebugger.logError('Error al decodificar token', error);
      setError('Error al identificar usuario. Por favor, inicia sesión nuevamente.');
      navigate('/login');
    }
  }, [navigate]);

  // Retry connection function
  const retryConnection = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      gameStateDebugger.logAction('max_retry_reached', { attempts: reconnectAttempts });
      setError('No se pudo conectar después de varios intentos. Intenta volver a las salas.');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    gameStateDebugger.logAction('retry_connection', { attempt: reconnectAttempts + 1 });

    if (socketRef.current) {
      gameStateDebugger.logSocketEvent('disconnect_before_retry', { socketId: socketRef.current.id });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      initializeSocket();
    }, 2000);
  }, [reconnectAttempts]);

  // Request game state function
  const requestGameState = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      gameStateDebugger.logError('request_state_failed', 'Socket no conectado para solicitar estado');
      return;
    }

    gameStateDebugger.logSync('requesting_game_state', { socketId: socketRef.current.id });
    socketRef.current.emit('solicitar_estado_juego_ws');
    
    if (estadoTimeoutRef.current) clearTimeout(estadoTimeoutRef.current);
    
    estadoTimeoutRef.current = setTimeout(() => {
      if (!gameState) {
        gameStateDebugger.logSync('request_timeout', {});
        setError('No se recibió respuesta del servidor. Intenta reconectar.');
      }
    }, 10000);
  }, [gameState]);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!codigoSala || !jugadorId) {
      console.log('[CLIENT] Falta código de sala o ID de jugador para conectar');
      return;
    }

    console.log("[CLIENT] Conectando socket para sala:", codigoSala);
    setIsLoading(true);
    setError(null);

    const socket = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[CLIENT] Socket conectado:', socket.id);
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('autenticar_socket', token);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[CLIENT] Error de conexión:', error);
      setError('Error de conexión al servidor');
      setIsLoading(false);
      
      setTimeout(() => {
        if (socketRef.current?.disconnected) {
          retryConnection();
        }
      }, 3000);
    });

    // Authentication events
    socket.on('autenticacion_exitosa', (data) => {
      console.log('[CLIENT] Socket autenticado:', data);
      socket.emit('unirse_sala_juego', codigoSala);
    });

    socket.on('autenticacion_fallida', (error) => {
      console.error('[CLIENT] Error de autenticación:', error);
      setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      setIsLoading(false);
    });

    // Room events
    socket.on('unido_sala_juego', (data) => {
      console.log('[CLIENT] Unido a sala:', data);
      setTimeout(() => {
        requestGameState();
      }, 500);
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

    socket.on('estado_juego_actualizado', (estado) => {
      console.log('[CLIENT] Estado actualizado:', estado);
      gameStateDebugger.logSync('state_received', {
        estadoPartida: estado.estadoPartida,
        equipos: estado.equipos?.length,
        jugadores: estado.jugadores?.length
      });
      
      if (estadoTimeoutRef.current) {
        clearTimeout(estadoTimeoutRef.current);
        estadoTimeoutRef.current = null;
      }

      const isValidState = estado && 
                          estado.equipos?.length > 0 && 
                          estado.jugadores?.length > 0;
      
      if (estado.estadoPartida === 'error' || !isValidState) {
        const errorMsg = estado.mensajeError || 'Estado de juego incompleto';
        setError(errorMsg);
        setIsLoading(false);
      } else {
        setGameState(estado);
        setError(null);
        setIsLoading(false);
        setReconnectAttempts(0);
      }
    });

    socket.on('esperando_inicio_partida', (data) => {
      console.log('[CLIENT] ⏳ Esperando inicio:', data);
      setIsLoading(true);
      
      const interval = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('solicitar_estado_juego_ws');
        } else {
          clearInterval(interval);
        }
      }, 3000);
      
      socket.once('estado_juego_actualizado', () => {
        clearInterval(interval);
      });
    });

    socket.on('error_estado_juego', (data) => {
      console.error('[CLIENT] Error de estado:', data);
      gameStateDebugger.logError('game_state_error', data);
      setError(data.message);
      setIsLoading(false);
    });

    socket.on('disconnect', () => {
      console.log('[CLIENT] Socket desconectado');
      setError('Desconectado del servidor. Intentando reconectar...');
      setIsLoading(true);
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
  }, [codigoSala, jugadorId, retryConnection, requestGameState]);

  // Initialize socket when we have all required data
  useEffect(() => {
    if (codigoSala && jugadorId && !socketRef.current) {
      initializeSocket();
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (estadoTimeoutRef.current) clearTimeout(estadoTimeoutRef.current);
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

  return {
    socket: socketRef.current,
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
  };
}
