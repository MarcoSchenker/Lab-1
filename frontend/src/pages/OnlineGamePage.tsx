import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './OnlineGamePage.css';
import Header from '../components/HeaderDashboard';

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

  // Determinar el jugador actual basado en el token almacenado
  useEffect(() => {
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
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      setError('Error al identificar usuario. Por favor, inicia sesión nuevamente.');
      navigate('/login');
    }
  }, [navigate]);

  // Inicializar la conexión WebSocket
  useEffect(() => {
    if (!codigoSala || !jugadorId) return;

    console.log("[CLIENT] Intentando conectar al socket con:", {
      url: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      codigoSala,
      jugadorId
    });

    // Conectar al servidor WebSocket
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001');
    socketRef.current = socket;

    // Manejar conexión exitosa
    socket.on('connect', () => {
      console.log('[CLIENT] Socket conectado exitosamente con ID:', socket.id);
      setMensajeEstado('Conectado al servidor, autenticando...');
    });

    // Manejar errores de conexión
    socket.on('connect_error', (error) => {
      console.error('[CLIENT] Error de conexión al socket:', error);
      setError('Error de conexión al servidor. Revisa tu conexión a internet.');
    });

    // Autenticar el socket
    const token = localStorage.getItem('token');
    if (token) {
      console.log('[CLIENT] Enviando token de autenticación...');
      socket.emit('autenticar_socket', token);
    }

    // Manejar autenticación exitosa
    socket.on('autenticacion_exitosa', (data) => {
      console.log('[CLIENT] Socket autenticado correctamente:', data);
      setMensajeEstado('Autenticado, uniéndose a sala...');
      
      socket.emit('unirse_sala_juego', codigoSala);
    });

    // Manejar unión exitosa a sala
    socket.on('unido_sala_juego', (data) => {
      console.log('[CLIENT] Unido a sala exitosamente:', data);
      setMensajeEstado('Unido a sala, cargando partida...');
      
      // Solicitar estado después de unirse con un pequeño delay
      setTimeout(() => {
        console.log('[CLIENT] Solicitando estado inicial del juego...');
        socket.emit('cliente_solicitar_estado_juego');
      }, 1500);
    });

    // Manejar autenticación fallida
    socket.on('autenticacion_fallida', (error) => {
      console.error('[CLIENT] Error de autenticación del socket:', error);
      setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
    });

    // Manejar recepción del estado del juego
    socket.on('estado_juego_actualizado', (estado) => {
      console.log('[CLIENT] Estado del juego recibido exitosamente:', estado);
      setEstadoJuego(estado);
      setMensajeEstado('');
    });

    // Manejar estado de espera
    socket.on('esperando_inicio_partida', (data) => {
      console.log('[CLIENT] ⏳ Esperando inicio de partida:', data);
      setMensajeEstado(data.mensaje || 'Esperando que inicie la partida...');
      
      // Reintentrar obtener estado cada 3 segundos
      const interval = setInterval(() => {
        console.log('[CLIENT] Reintentando obtener estado...');
        socket.emit('cliente_solicitar_estado_juego');
      }, 3000);
      
      // Limpiar interval si se recibe el estado
      socket.once('estado_juego_actualizado', () => {
        clearInterval(interval);
      });
    });

    // Manejar errores del juego
    socket.on('error_juego', (data) => {
      console.error('[CLIENT]  Error en el juego:', data);
      setError(data.message || 'Error en el juego');
    });

    // Manejar eventos específicos del juego
    socket.on('turno_actualizado', (data) => {
      const esMiTurno = data.jugadorTurnoActualId === jugadorId;
      setMensajeEstado(esMiTurno ? '¡Es tu turno!' : `Turno de: ${obtenerNombreJugador(data.jugadorTurnoActualId)}`);
    });

    socket.on('carta_jugada', (data) => {
      setMensajeEstado(`${obtenerNombreJugador(data.jugadorId)} jugó ${formatearCarta(data.carta)}`);
    });

    socket.on('canto_realizado', (data) => {
      setMensajeEstado(`${obtenerNombreJugador(data.jugadorId)} cantó ${formatearCanto(data.tipoCanto)}`);
    });

    socket.on('respuesta_canto', (data) => {
      setMensajeEstado(`${obtenerNombreJugador(data.jugadorId)} respondió ${formatearRespuesta(data.respuesta)}`);
    });

    socket.on('envido_querido_declarar_puntos', (data) => {
      if (data.turnoDeclararId === jugadorId) {
        setMensajeEstado('Debes declarar tus puntos de envido');
      } else {
        setMensajeEstado(`${obtenerNombreJugador(data.turnoDeclararId)} está declarando sus puntos`);
      }
    });

    socket.on('envido_resuelto', (data) => {
      setMensajeEstado(`Envido ganado por ${obtenerNombreEquipo(data.equipoGanadorId)} (${data.puntosGanados} puntos)`);
    });

    socket.on('resultado_mano', (data) => {
      if (data.fueParda) {
        setMensajeEstado('Mano parda');
      } else {
        setMensajeEstado(`Mano ganada por ${obtenerNombreJugador(data.ganadorManoJugadorId)}`);
      }
    });

    socket.on('resultado_ronda', (data) => {
      setMensajeEstado(`Ronda ganada por ${obtenerNombreEquipo(data.ganadorRondaEquipoId)}`);
    });

    socket.on('fin_partida', (data) => {
      setMensajeEstado(`¡Partida finalizada! Ganador: ${obtenerNombreEquipo(data.ganadorPartidaId)}`);
    });

    socket.on('jugador_desconectado', (data) => {
      setMensajeEstado(`${obtenerNombreJugador(data.jugadorId)} se ha desconectado`);
    });

    socket.on('jugador_reconectado', (data) => {
      setMensajeEstado(`${obtenerNombreJugador(data.jugadorId)} se ha reconectado`);
    });

    socket.on('retomar_truco_pendiente', (data) => {
      setMensajeEstado('Se retoma el truco pendiente');
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('[CLIENT] Desconectado del servidor');
      setMensajeEstado('Conexión perdida. Intentando reconectar...');
      
      // Intentar reconectar después de un breve retraso
      setTimeout(() => {
        if (socketRef.current?.disconnected) {
          console.log('[CLIENT] Intentando reconectar...');
          socketRef.current.connect();
        }
      }, 2000);
    });

    // Limpiar socket al desmontar el componente
    return () => {
      if (socketRef.current) {
        console.log('[CLIENT] Desconectando socket...');
        socketRef.current.disconnect();
      }
    };
  }, [codigoSala, jugadorId]);

  // Polling para solicitar estado si no llega
  useEffect(() => {
    if (!socketRef.current || !codigoSala || estadoJuego) return;
    
    // Solicitar actualizaciones del estado cada 10 segundos por si se perdió algún evento
    const intervalId = setInterval(() => {
      if (socketRef.current?.connected && !estadoJuego) {
        console.log('[CLIENT] Solicitando estado (polling)...');
        socketRef.current.emit('cliente_solicitar_estado_juego');
      }
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [codigoSala, estadoJuego]);

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

  // Funciones para acciones del juego
  const jugarCarta = (carta: Carta) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cliente_jugar_carta', { carta });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const cantar = (tipoCanto: string) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cliente_cantar', { tipo_canto: tipoCanto });
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const responderCanto = (respuesta: string) => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cliente_responder_canto', { 
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
    socketRef.current.emit('cliente_responder_canto', { 
      respuesta: puntos,
      canto_respondido_tipo: 'ENVIDO'
    });
    setPuntosEnvido('');
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const declararSonBuenas = () => {
    if (!socketRef.current) return;
    setEsperandoRespuesta(true);
    socketRef.current.emit('cliente_son_buenas_envido', {});
    setTimeout(() => setEsperandoRespuesta(false), 500);
  };

  const irseAlMazo = () => {
    if (!socketRef.current) return;
    if (window.confirm('¿Estás seguro de que quieres irte al mazo?')) {
      socketRef.current.emit('cliente_irse_al_mazo');
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

  // Renderizar el componente
  if (error) {
    return (
      <div className="game-error-container">
        <Header />
        <div className="game-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/salas')}>Volver a las Salas</button>
          <button onClick={() => {
            setError(null);
            window.location.reload();
          }} className="reconnect-button">
            Intentar Reconectar
          </button>
        </div>
      </div>
    );
  }

  if (!estadoJuego) {
    return (
      <div className="game-loading-container">
        <Header />
        <div className="game-loading">
          <h2>Cargando partida...</h2>
          <p>{mensajeEstado}</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Obtener las cartas del jugador actual
  const misCartas = estadoJuego.jugadores.find(j => j.id === jugadorId)?.cartasMano || [];
  
  return (
    <div className="game-container">
      <Header />
      <div className="game-content">
        <div className="game-header">
          <h1>Partida de Truco - Sala: {estadoJuego.codigoSala}</h1>
          <div className="game-info">
            <span>Tipo: {estadoJuego.tipoPartida}</span>
            <span>Ronda: {estadoJuego.numeroRondaActual}</span>
            <span>Objetivo: {estadoJuego.puntosVictoria} puntos</span>
          </div>
        </div>
        
        {mensajeEstado && (
          <div className="estado-mensaje">
            {mensajeEstado}
          </div>
        )}
        
        <div className="game-board">
          {/* Información de equipos */}
          <div className="equipos-container">
            {estadoJuego.equipos.map(equipo => (
              <div key={equipo.id} className={`equipo-card ${equipo.jugadoresIds.includes(jugadorId || -1) ? 'mi-equipo' : ''}`}>
                <h3>{equipo.nombre}</h3>
                <div className="equipo-puntos">{equipo.puntosPartida} puntos</div>
                <div className="equipo-jugadores">
                  {equipo.jugadoresIds.map(jId => {
                    const jugador = estadoJuego.jugadores.find(j => j.id === jId);
                    return (
                      <div key={jId} className={`jugador-tag ${jugador?.estadoConexion === 'desconectado' ? 'desconectado' : ''}`}>
                        {jugador?.nombreUsuario}
                        {jugador?.esPie && ' (Pie)'}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Mesa de juego */}
          <div className="mesa-juego">
            <h3>Mesa - Mano {estadoJuego.rondaActual.turnoInfo.manoActualNumero}</h3>
            <div className="cartas-mesa">
              {estadoJuego.rondaActual.turnoInfo.cartasEnMesaManoActual.map((jugada, idx) => (
                <div key={idx} className="carta-jugada">
                  <div className="carta-jugada-info">
                    <span>{obtenerNombreJugador(jugada.jugadorId)}</span>
                    <div className={`carta ${jugada.carta.palo.toLowerCase()}`}>
                      <span className="carta-numero">{jugada.carta.numero}</span>
                      <span className="carta-palo">
                        {jugada.carta.palo === 'ESPADA' ? 'Espada' : 
                         jugada.carta.palo === 'BASTO' ? 'Basto' :
                         jugada.carta.palo === 'COPA' ? 'Copa' : 'Oro'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Historial de manos */}
          {estadoJuego.rondaActual.turnoInfo.manosJugadas.length > 0 && (
            <div className="historial-manos">
              <h3>Manos anteriores</h3>
              <div className="manos-container">
                {estadoJuego.rondaActual.turnoInfo.manosJugadas.map((mano, idx) => (
                  <div key={idx} className="mano-previa">
                    <h4>Mano {idx + 1}</h4>
                    <div className="mano-resultado">
                      {mano.fueParda ? 'Parda' : `Ganador: ${obtenerNombreJugador(mano.ganadorManoJugadorId)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Mis cartas */}
          <div className="mis-cartas">
            <h3>Mis cartas</h3>
            <div className="cartas-container">
              {misCartas.length > 0 ? (
                misCartas.map((carta, idx) => (
                  <div 
                    key={carta.idUnico} 
                    className={`carta ${carta.palo.toLowerCase()} ${esMiTurno() ? 'jugable' : ''}`}
                    onClick={() => esMiTurno() ? jugarCarta(carta) : null}
                  >
                    <span className="carta-numero">{carta.numero}</span>
                    <span className="carta-palo">
                      {carta.palo === 'ESPADA' ? 'Espada' : 
                       carta.palo === 'BASTO' ? 'Basto' :
                       carta.palo === 'COPA' ? 'Copa' : 'Oro'}
                    </span>
                    {carta.valorEnvido > 0 && (
                      <span className="carta-envido">{carta.valorEnvido}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="sin-cartas">No tienes cartas</div>
              )}
            </div>
          </div>
          
          {/* Acciones del juego */}
          <div className="acciones-juego">
            {/* Cantos de Envido */}
            {deboCantarEnvido() && (
              <div className="acciones-grupo">
                <h4>Cantar Envido</h4>
                <div className="botones-container">
                  <button onClick={() => cantar('ENVIDO')}>Envido</button>
                  <button onClick={() => cantar('REAL_ENVIDO')}>Real Envido</button>
                  <button onClick={() => cantar('FALTA_ENVIDO')}>Falta Envido</button>
                </div>
              </div>
            )}
            
            {/* Cantos de Truco */}
            {esMiTurno() && !estadoJuego.rondaActual.trucoInfo.cantado && (
              <div className="acciones-grupo">
                <h4>Cantar Truco</h4>
                <button onClick={() => cantar('TRUCO')}>Truco</button>
              </div>
            )}
            
            {/* Responder a cantos */}
            {deboResponderCanto() && estadoJuego.rondaActual.envidoInfo.estadoResolucion === 'pendiente_respuesta' && (
              <div className="acciones-grupo">
                <h4>Responder Envido</h4>
                <div className="botones-container">
                  <button onClick={() => responderCanto('QUIERO')}>Quiero</button>
                  <button onClick={() => responderCanto('NO_QUIERO')}>No Quiero</button>
                </div>
              </div>
            )}
            
            {deboResponderTruco() && (
              <div className="acciones-grupo">
                <h4>Responder Truco</h4>
                <div className="botones-container">
                  <button onClick={() => responderCanto('QUIERO')}>Quiero</button>
                  <button onClick={() => responderCanto('NO_QUIERO')}>No Quiero</button>
                  
                  {/* Retruco y Vale Cuatro */}
                  {estadoJuego.rondaActual.trucoInfo.nivelActual === 'TRUCO' && (
                    <button onClick={() => responderCanto('RETRUCO')}>Retruco</button>
                  )}
                  
                  {estadoJuego.rondaActual.trucoInfo.nivelActual === 'RETRUCO' && (
                    <button onClick={() => responderCanto('VALE_CUATRO')}>Vale Cuatro</button>
                  )}
                </div>
              </div>
            )}
            
            {/* Declarar puntos de envido */}
            {deboDeclararPuntos() && (
              <div className="acciones-grupo">
                <h4>Declarar Puntos Envido</h4>
                <form onSubmit={declararPuntosEnvido} className="form-puntos">
                  <input 
                    type="number" 
                    min="0" 
                    max="33" 
                    value={puntosEnvido} 
                    onChange={(e) => setPuntosEnvido(e.target.value)}
                    placeholder="Tus puntos"
                    required
                  />
                  <button type="submit">Declarar</button>
                </form>
                
                {/* Son Buenas */}
                {puedoDeclararSonBuenas() && (
                  <button onClick={declararSonBuenas} className="son-buenas-btn">
                    Son Buenas
                  </button>
                )}
              </div>
            )}
            
            {/* Irse al mazo */}
            <div className="acciones-grupo">
              <button onClick={irseAlMazo} className="mazo-btn">
                Irse al Mazo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineGamePage;