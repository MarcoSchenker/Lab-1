import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './OnlineGamePage.css';
import Header from '../components/HeaderDashboard';
import GameReconnectOptions from '../components/GameReconnectOptions';
import GameStateViewer from '../components/GameStateViewer';
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

// Componente GamePage
const OnlineGamePage: React.FC = () => {
  const { codigoSala } = useParams<{ codigoSala: string }>();
  const navigate = useNavigate();
  const [estadoJuego, setEstadoJuego] = useState<EstadoJuego | null>(null);
  const [jugadorId, setJugadorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [puntosEnvido, setPuntosEnvido] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const [mensajeEstado, setMensajeEstado] = useState<string>('Cargando partida...');
  const [jugadorSkins, setJugadorSkins] = useState<Record<number, string>>({});
  const [showReconnectOption, setShowReconnectOption] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [totalReconnectAttempts, setTotalReconnectAttempts] = useState<number>(0);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const maxReconnectAttempts = 5;
  const MAX_TOTAL_RETRY_ATTEMPTS = 15;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const estadoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determinar el jugador actual basado en el token almacenado
  useEffect(() => {
    gameStateDebugger.logAction('page_loaded', { codigoSala });
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No estás autenticado. Por favor, inicia sesión.');
      navigate('/login');
      return;
    }

    // Decodificar el token para obtener el ID del usuario
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setJugadorId(payload.id);
      gameStateDebugger.logAction('user_identified', { userId: payload.id });
    } catch (error) {
      gameStateDebugger.logError('Error al decodificar token', error);
      setError('Error al identificar usuario. Por favor, inicia sesión nuevamente.');
      navigate('/login');
    }

    // Mostrar opciones de reconexión después de un tiempo
    const showReconnectTimeout = setTimeout(() => {
      if (!estadoJuego) {
        setShowReconnectOption(true);
        gameStateDebugger.logAction('show_reconnect_options', { reason: 'timeout' });
      }
    }, 10000);

    return () => {
      clearTimeout(showReconnectTimeout);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (estadoTimeoutRef.current) clearTimeout(estadoTimeoutRef.current);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [navigate, estadoJuego]);

  // Enhanced retry connection function with total attempts tracking
  const retryConnection = useCallback(() => {
    // Check both current batch attempts and total attempts
    if (reconnectAttempts >= maxReconnectAttempts || totalReconnectAttempts >= MAX_TOTAL_RETRY_ATTEMPTS) {
      gameStateDebugger.logAction('max_retry_reached', { 
        batchAttempts: reconnectAttempts,
        totalAttempts: totalReconnectAttempts 
      });
      
      if (totalReconnectAttempts >= MAX_TOTAL_RETRY_ATTEMPTS) {
        setError('Se ha alcanzado el límite máximo de intentos de conexión. Por favor, intenta más tarde.');
      } else {
        setError('No se pudo conectar después de varios intentos. Intenta volver a las salas.');
      }
      return;
    }

    // Increment both counters
    setReconnectAttempts(prev => prev + 1);
    setTotalReconnectAttempts(prev => prev + 1);
    
    const newAttemptCount = reconnectAttempts + 1;
    setMensajeEstado(`Reintentando conexión (${newAttemptCount}/${maxReconnectAttempts})...`);
    
    gameStateDebugger.logAction('retry_connection', { 
      batchAttempt: newAttemptCount,
      maxBatchAttempts: maxReconnectAttempts,
      totalAttempts: totalReconnectAttempts + 1,
      maxTotalAttempts: MAX_TOTAL_RETRY_ATTEMPTS
    });

    // Desconectar el socket actual si existe
    if (socketRef.current) {
      gameStateDebugger.logSocketEvent('disconnect_before_retry', { socketId: socketRef.current.id });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Esperar un momento y reiniciar el proceso - tiempo creciente para esperar más en intentos posteriores
    const waitTime = 1500 + (totalReconnectAttempts * 500); // Increase wait time with more attempts
    
    reconnectTimeoutRef.current = setTimeout(() => {
      gameStateDebugger.logAction('initialize_socket_after_retry', { waitTime });
      initializeSocket();
    }, waitTime);
  }, [reconnectAttempts, totalReconnectAttempts]);
  
  // Reiniciar la aplicación (recarga la página)
  const restartApp = useCallback(() => {
    gameStateDebugger.logAction('restart_app', {});
    window.location.reload();
  }, []);

  // Función para solicitar estado del juego con múltiples intentos - actualizada para usar nuevo evento
  const requestGameState = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      gameStateDebugger.logError('request_state_failed', 'Socket no conectado para solicitar estado');
      return;
    }

    gameStateDebugger.logSync('requesting_game_state', { socketId: socketRef.current.id });
    // Usar el nuevo evento WebSocket para solicitar estado
    socketRef.current.emit('solicitar_estado_juego_ws');
    
    // Configurar un timeout para mostrar error si no recibimos respuesta
    if (estadoTimeoutRef.current) clearTimeout(estadoTimeoutRef.current);
    
    // Establecer contador de intentos automáticos
    let attemptsMade = 0;
    const maxAutoRetries = 3;
    
    // Función para reintentar automáticamente
    const autoRetry = () => {
      if (attemptsMade < maxAutoRetries && !estadoJuego) {
        attemptsMade++;
        gameStateDebugger.logSync('auto_retry_request_state', { attempt: attemptsMade, maxAutoRetries });
        socketRef.current?.emit('solicitar_estado_juego_ws');
        
        // Configurar el siguiente reintento
        estadoTimeoutRef.current = setTimeout(autoRetry, 2000);
      } else if (!estadoJuego) {
        // Después de todos los intentos automáticos, mostrar opciones de reconexión
        gameStateDebugger.logSync('all_auto_retries_failed', { attempts: attemptsMade });
        setShowReconnectOption(true);
        setMensajeEstado('No se recibió respuesta del servidor. Puedes intentar reconectar manualmente.');
      }
    };
    
    // Iniciar el ciclo de reintento después del tiempo inicial
    estadoTimeoutRef.current = setTimeout(autoRetry, 5000);
  }, [estadoJuego]);

  // Inicializar la conexión WebSocket
  const initializeSocket = useCallback(() => {
    if (!codigoSala || !jugadorId) {
      console.log('[CLIENT] Falta código de sala o ID de jugador para conectar');
      return;
    }

    console.log("[CLIENT] Intentando conectar al socket con:", {
      url: 'http://localhost:3001',
      codigoSala,
      jugadorId,
      intento: reconnectAttempts + 1
    });

    // Conectar al servidor WebSocket
    const socket = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    socketRef.current = socket;

    // Manejar conexión exitosa
    socket.on('connect', () => {
      console.log('[CLIENT] Socket conectado exitosamente con ID:', socket.id);
      setMensajeEstado('Conectado al servidor, autenticando...');
      setShowReconnectOption(false);

      // Autenticar el socket
      const token = localStorage.getItem('token');
      if (token) {
        console.log('[CLIENT] Enviando token de autenticación...');
        socket.emit('autenticar_socket', token);
      }
    });

    // Manejar errores de conexión
    socket.on('connect_error', (error) => {
      console.error('[CLIENT] Error de conexión al socket:', error);
      setShowReconnectOption(true);
      setMensajeEstado('Error de conexión al servidor. Reintentando...');
      
      // Reintentar automáticamente después de un tiempo
      setTimeout(() => {
        if (socketRef.current?.disconnected) {
          retryConnection();
        }
      }, 3000);
    });

    // Manejar autenticación exitosa
    socket.on('autenticacion_exitosa', (data) => {
      console.log('[CLIENT] Socket autenticado correctamente:', data);
      setMensajeEstado('Autenticado, uniéndose a sala...');
      
      // Unirse a la sala 
      socket.emit('unirse_sala_juego', codigoSala);
    });

    // Manejar unión exitosa a sala
    socket.on('unido_sala_juego', (data) => {
      console.log('[CLIENT] Unido a sala exitosamente:', data);
      setMensajeEstado('Unido a sala, cargando partida...');
      
      // Solicitar estado después de unirse con un pequeño delay
      setTimeout(() => {
        requestGameState();
      }, 500);
    });

    // Manejar autenticación fallida
    socket.on('autenticacion_fallida', (error) => {
      console.error('[CLIENT] Error de autenticación del socket:', error);
      setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
    });

    // Manejar recepción del estado del juego
    socket.on('estado_juego_actualizado', (estado) => {
      console.log('[CLIENT] Recibido estado_juego_actualizado:', {
        estadoPartida: estado.estadoPartida,
        equipos: estado.equipos?.length,
        jugadores: estado.jugadores?.length
      });
      
      gameStateDebugger.logSync('state_received', {
        estadoPartida: estado.estadoPartida,
        equipos: estado.equipos?.length,
        jugadores: estado.jugadores?.length,
        socketId: socket.id
      });
      
      if (estadoTimeoutRef.current) {
        clearTimeout(estadoTimeoutRef.current);
        estadoTimeoutRef.current = null;
      }

      // Verificar estado completo y válido
      const isValidState = estado && 
                          estado.equipos?.length > 0 && 
                          estado.jugadores?.length > 0;
      
      // Verificar si hay error en el estado
      if (estado.estadoPartida === 'error' || !isValidState) {
        const errorMsg = estado.mensajeError || (isValidState ? 'Error desconocido' : 'Estado de juego incompleto');
        gameStateDebugger.logError('invalid_game_state', { error: errorMsg, data: estado });
        console.error('[CLIENT] Error en el estado del juego:', errorMsg);
        setMensajeEstado(`Error: ${errorMsg}`);
        setShowReconnectOption(true);
      } else {
        gameStateDebugger.logSync('valid_state_applied', { estadoPartida: estado.estadoPartida });
        setEstadoJuego(estado);
        setMensajeEstado('');
        setShowReconnectOption(false);
        setReconnectAttempts(0); // Resetear intentos cuando obtenemos estado
      }
    });

    // Manejar estado de espera
    socket.on('esperando_inicio_partida', (data) => {
      console.log('[CLIENT] ⏳ Esperando inicio de partida:', data);
      setMensajeEstado(data.mensaje || 'Esperando que inicie la partida...');
      
      // Reintentrar obtener estado periódicamente usando el nuevo evento
      const interval = setInterval(() => {
        console.log('[CLIENT] Reintentando obtener estado...');
        if (socketRef.current?.connected) {
          socketRef.current.emit('solicitar_estado_juego_ws');
        } else {
          clearInterval(interval);
        }
      }, 3000);
      
      // Limpiar interval si se recibe el estado
      socket.once('estado_juego_actualizado', () => {
        clearInterval(interval);
      });
    });
    
    // Manejar solicitud de compartir estado
    socket.on('solicitar_compartir_estado', (data) => {
      console.log('[CLIENT] Solicitud de compartir estado recibida:', data);
      gameStateDebugger.logSync('share_state_request', data);
      
      // Verificar si tenemos estado para compartir
      if (estadoJuego) {
        console.log('[CLIENT] Compartiendo nuestro estado con jugador:', data.solicitanteId);
        gameStateDebugger.logSync('sharing_state', { with: data.solicitanteId });
        
        // Enviar nuestro estado al socket específico
        socket.emit('estado_compartido_por_jugador', {
          estadoJuego,
          compartidoPorId: jugadorId
        });
      }
    });
    
    // Recibir notificación de que hay estado actualizado disponible
    socket.on('estado_actualizado_disponible', (data) => {
      console.log('[CLIENT] Estado actualizado disponible:', data);
      gameStateDebugger.logSync('updated_state_available', data);
      
      // Si no tenemos estado o estamos en espera, solicitar
      if (!estadoJuego || mensajeEstado) {
        requestGameState();
      }
    });
    
    // Manejar error de estado de juego
    socket.on('error_estado_juego', (data) => {
      console.error('[CLIENT] Error de estado de juego:', data);
      gameStateDebugger.logError('game_state_error', data);
      
      // Si tenemos un estado, no interrumpir el juego pero mostrar un toast o notificación
      if (estadoJuego) {
        console.warn('[CLIENT] Problema con el estado de juego, pero seguimos jugando:', data.message);
      } else {
        setMensajeEstado(`Error: ${data.message}. Intentando recuperar...`);
        setTimeout(() => requestGameState(), 2000);
      }
    });

    // Manejar solicitud de reconexión del servidor
    socket.on('solicitar_reconexion', (data) => {
      console.log('[CLIENT] Solicitud de reconexión recibida:', data);
      gameStateDebugger.logSync('reconnection_requested', data);
      
      // Mostrar mensaje al usuario
      setMensajeEstado(`Reconectando para recuperar estado completo...`);
      
      // Desconectar y reconectar socket
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect();
          
          // Reconectar después de un breve retraso
          setTimeout(() => {
            retryConnection();
          }, 1000);
        }
      }, 500);
    });
    
    // Manejar recuperación de estado
    socket.on('estado_recuperacion', (data) => {
      console.log('[CLIENT] Estado en recuperación:', data);
      gameStateDebugger.logSync('recovery_state_received', data);
      
      setMensajeEstado('Recuperando estado de juego...');
      
      // Si recibimos un estado parcial de recuperación, lo guardamos temporalmente
      // pero seguimos mostrando la pantalla de carga hasta recibir un estado completo
      if (data.estadoPartida === 'recuperando') {
        setTimeout(() => {
          socket.emit('solicitar_estado_juego_ws');
        }, 3000);
      }
    });

    // Manejar inicio de partida - nuevo evento del backend
    socket.on('partida_iniciada', (data) => {
      console.log('[CLIENT] 🎮 Partida iniciada:', data);
      gameStateDebugger.logAction('partida_iniciada_received', data);
      
      setMensajeEstado(data.mensaje || 'Partida iniciada, solicitando estado inicial...');
      
      // Solicitar el estado inicial inmediatamente
      setTimeout(() => {
        if (socketRef.current?.connected) {
          console.log('[CLIENT] Solicitando estado inicial...');
          socketRef.current.emit('solicitar_estado_inicial');
        }
      }, 500);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('autenticacion_exitosa');
      socket.off('unido_sala_juego');
      socket.off('estado_juego_actualizado');
      socket.off('esperando_inicio_partida');
      socket.off('partida_iniciada');
      socket.off('error_juego');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [codigoSala, jugadorId, reconnectAttempts, retryConnection, requestGameState, estadoJuego, navigate]);

  // Inicializar la conexión cuando tenemos código de sala y jugador ID
  useEffect(() => {
    if (codigoSala && jugadorId && !socketRef.current) {
      initializeSocket();
    }
    
    return () => {
      if (socketRef.current) {
        console.log('[CLIENT] Limpiando socket al desmontar componente');
        socketRef.current.disconnect();
      }
    };
  }, [codigoSala, jugadorId, initializeSocket]);

  // Actualizar preferencias de skins basado en el estado del juego
  useEffect(() => {
    if (!estadoJuego) return;
    
    const nuevasSkins: Record<number, string> = {};
    estadoJuego.jugadores.forEach(jugador => {
      nuevasSkins[jugador.id] = jugador.skinPreferida || 'Original';
    });
    setJugadorSkins(nuevasSkins);
  }, [estadoJuego]);

  // Funciones auxiliares para obtener nombres
  const obtenerNombreJugador = useCallback((id: number | null): string => {
    if (!id || !estadoJuego) return 'Desconocido';
    const jugador = estadoJuego.jugadores.find(j => j.id === id);
    return jugador ? jugador.nombreUsuario : 'Desconocido';
  }, [estadoJuego]);

  const obtenerNombreEquipo = useCallback((id: number | null): string => {
    if (!id || !estadoJuego) return 'Desconocido';
    const equipo = estadoJuego.equipos.find(e => e.id === id);
    return equipo ? equipo.nombre : 'Desconocido';
  }, [estadoJuego]);

  const formatearCarta = (carta: Carta): string => {
    const palos: Record<string, string> = {
      'ESPADA': 'Espada',
      'BASTO': 'Basto',
      'COPA': 'Copa',
      'ORO': 'Oro',
    };
    return `${carta.numero} de ${palos[carta.palo] || carta.palo}`;
  };

  const formatearCanto = (canto: string): string => {
    const cantos: Record<string, string> = {
      'ENVIDO': 'Envido',
      'REAL_ENVIDO': 'Real Envido',
      'FALTA_ENVIDO': 'Falta Envido',
      'TRUCO': 'Truco',
      'RETRUCO': 'Retruco',
      'VALE_CUATRO': 'Vale Cuatro'
    };
    return cantos[canto] || canto;
  };

  const formatearRespuesta = (respuesta: string): string => {
    const respuestas: Record<string, string> = {
      'QUIERO': 'Quiero',
      'NO_QUIERO': 'No Quiero',
      'SON_BUENAS_ENVIDO': 'Son Buenas'
    };
    return respuestas[respuesta] || respuesta;
  };

  // Funciones para acciones del juego - actualizadas para usar nuevos eventos WebSocket
  const jugarCarta = (carta: Carta) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('jugar_carta_ws', { carta });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const cantar = (tipoCanto: string) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cantar_ws', { tipo_canto: tipoCanto });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const responderCanto = (respuesta: string) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta, 
      canto_respondido_tipo: estadoJuego?.rondaActual.envidoInfo.cantado ? 'ENVIDO' : 'TRUCO' 
    });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const declararPuntosEnvido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current || !puntosEnvido) return;
    
    const puntos = parseInt(puntosEnvido);
    if (isNaN(puntos) || puntos < 0 || puntos > 33) {
      setMensajeEstado('Puntos de envido inválidos (0-33)');
      return;
    }
    
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta: puntos,
      canto_respondido_tipo: 'ENVIDO'
    });
    setPuntosEnvido('');
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const declararSonBuenas = () => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('responder_canto_ws', { 
      respuesta: 'SON_BUENAS_ENVIDO',
      canto_respondido_tipo: 'ENVIDO'
    });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const irseAlMazo = () => {
    if (!socketRef.current) return;
    if (window.confirm('¿Estás seguro de que quieres irte al mazo?')) {
      socketRef.current.emit('irse_al_mazo_ws');
    }
  };

  // Verificar si es el turno del jugador actual
  const esMiTurno = (): boolean => {
    if (!estadoJuego || !jugadorId) return false;
    return estadoJuego.rondaActual.turnoInfo.jugadorTurnoActualId === jugadorId;
  };

  // Verificar si el jugador debe responder a un canto
  const deboCantarEnvido = (): boolean => {
    if (!estadoJuego || !jugadorId) return false;
    
    // Si hay un truco pendiente por envido primero, podemos cantar envido
    if (estadoJuego.rondaActual.trucoPendientePorEnvidoPrimero) {
      const miEquipo = estadoJuego.equipos.find(e => e.jugadoresIds.includes(jugadorId));
      if (!miEquipo) return false;
      
      // El equipo que debe responder al truco puede cantar envido
      return estadoJuego.rondaActual.trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
    }
    
    // En primera mano cualquiera puede cantar envido si no se ha cantado antes
    return esMiTurno() && 
           estadoJuego.rondaActual.turnoInfo.manoActualNumero === 1 && 
           !estadoJuego.rondaActual.envidoInfo.cantado;
  };

  const deboResponderCanto = (): boolean => {
    if (!estadoJuego || !jugadorId) return false;
    
    const miEquipo = estadoJuego.equipos.find(e => e.jugadoresIds.includes(jugadorId));
    if (!miEquipo) return false;
    
    // Verificar si debo responder al envido
    if (estadoJuego.rondaActual.envidoInfo.cantado && 
        estadoJuego.rondaActual.envidoInfo.estadoResolucion === 'pendiente_respuesta' &&
        estadoJuego.rondaActual.envidoInfo.cantadoPorEquipoId !== miEquipo.id) {
      return true;
    }
    
    // Verificar si debo responder al truco
    if (estadoJuego.rondaActual.trucoInfo.cantado &&
        estadoJuego.rondaActual.trucoInfo.estadoResolucion === 'pendiente_respuesta' &&
        estadoJuego.rondaActual.trucoInfo.equipoDebeResponderTrucoId === miEquipo.id) {
      return true;
    }
    
    return false;
  };

  const deboResponderTruco = (): boolean => {
    if (!estadoJuego || !jugadorId) return false;
    
    const miEquipo = estadoJuego.equipos.find(e => e.jugadoresIds.includes(jugadorId));
    if (!miEquipo) return false;
    
    return estadoJuego.rondaActual.trucoInfo.cantado &&
           estadoJuego.rondaActual.trucoInfo.estadoResolucion === 'pendiente_respuesta' &&
           estadoJuego.rondaActual.trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
  };

  const deboDeclararPuntos = (): boolean => {
    if (!estadoJuego || !jugadorId) return false;
    
    return estadoJuego.rondaActual.envidoInfo.estadoResolucion === 'querido_pendiente_puntos' &&
           estadoJuego.rondaActual.envidoInfo.cantado &&
           estadoJuego.rondaActual.turnoInfo.jugadorTurnoActualId === jugadorId;
  };

  const puedoDeclararSonBuenas = (): boolean => {
    if (!estadoJuego || !jugadorId || !deboDeclararPuntos()) return false;
    
    // Solo el segundo equipo en declarar puede decir "Son Buenas"
    return Object.keys(estadoJuego.rondaActual.envidoInfo.puntosDeclarados).length > 0;
  };

  // Función para obtener la ruta de la skin para un jugador específico
  const obtenerRutaSkin = useCallback((jugadorId: number) => {
    const nombreSkin = jugadorSkins[jugadorId] || 'Original';
    return `/cartas/mazo${nombreSkin}`;
  }, [jugadorSkins]);

  const renderizarCarta = (carta: Carta, jugadorDueno: number) => {
    const rutaSkin = obtenerRutaSkin(jugadorDueno);
    // Renderizar la carta usando rutaSkin como base para la imagen
    return (
      <img 
        src={`${rutaSkin}/${carta.palo}_${carta.numero}.png`}
        alt={`${carta.numero} de ${carta.palo}`} 
        className="carta"
      />
    );
  };

  // Toggle debug panel
  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
    gameStateDebugger.logAction('toggle_debug_panel', { showing: !showDebugPanel });
  }, [showDebugPanel]);

  // Método para forzar refrescar el estado manualmente
  const forceRefreshState = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      gameStateDebugger.logError('force_refresh_failed', 'Socket no conectado');
      return;
    }

    gameStateDebugger.logAction('manual_refresh_state', { socketId: socketRef.current.id });
    setMensajeEstado('Actualizando estado del juego...');
    socketRef.current.emit('cliente_solicitar_estado_juego');
    
    // También solicitar a otros jugadores que compartan su estado
    if (codigoSala) {
      socketRef.current.emit('solicitar_compartir_estado', {
        solicitanteId: jugadorId,
        socketId: socketRef.current.id
      });
    }
  }, [codigoSala, jugadorId]);

  // Determinar contenido principal basado en el estado actual
  let mainContent;
  if (error) {
    mainContent = <div className="error-message">{error}</div>;
  } else if (!estadoJuego) {
    mainContent = (
      <div className="loading-state">
        <div className="spinner"></div>
        <p className="loading-message">{mensajeEstado}</p>
        
        {showReconnectOption && (
          <GameReconnectOptions 
            socket={socketRef.current} 
            codigoSala={codigoSala || ''} 
            attemptCount={reconnectAttempts}
            maxAttempts={maxReconnectAttempts}
            onRetry={retryConnection}
            onRestart={restartApp}
          />
        )}
      </div>
    );
  } else {
    // Contenido normal del juego cuando tenemos estadoJuego
    // ...código existente de renderizado del juego...
  }
  
  return (
    <div className="game-page">
      <Header />
      
      {/* Botón de depuración accesible solo con teclas especiales */}
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
              gameState={estadoJuego} 
              socketId={socketRef.current?.id || null}
              onManualRefresh={forceRefreshState}
            />
          </div>
        </div>
      )}
      
      {mainContent}
    </div>
  );
};

export default OnlineGamePage;