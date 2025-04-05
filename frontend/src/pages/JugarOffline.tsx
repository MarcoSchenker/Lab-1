import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EstadoPartida, Jugador, Ronda, aceptarUltimaRonda, agregarRonda, puedeCantarEnvido, puedeCantarFaltaEnvido, puedeCantarRealEnvido, puedeCantarRetruco, puedeCantarTruco, puedeCantarValeCuatro, rechazarUltimaRonda, puntosPorEnvido, puntosPorNoQuieroEnvido, puntosPorNoQuieroTruco } from '../game/Logic';
import jugarFacil from '../dificultades/facil';
import jugarDificil from '../dificultades/dificil';
import './JugarOffline.css';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Función para generar cartas aleatorias
function generarCartasAleatorias(cantidad: number): string[] {
  const palos = ['oro', 'copa', 'espada', 'basto'];
  const valores = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];
  const mazo: string[] = [];
  
  // Generar todas las combinaciones posibles
  for (const palo of palos) {
    for (const valor of valores) {
      mazo.push(`${valor}${palo}`);
    }
  }
  
  // Mezclar el mazo
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  
  // Tomar las cartas necesarias
  return mazo.slice(0, cantidad);
}

const JugarOffline: React.FC = () => {
  const query = useQuery();
  const dificultad = query.get('dificultad') as 'facil' | 'dificil' | null;

  const [estado, setEstado] = useState<EstadoPartida | null>(null);
  const [cartasJugadas, setCartasJugadas] = useState<Array<{jugadorId: string, carta: string, ronda: number}>>([]);
  const [mostrarRespuesta, setMostrarRespuesta] = useState<boolean>(false);
  const [rondaActual, setRondaActual] = useState<number>(0);

  useEffect(() => {
    if (!dificultad) return;

    // Generar 6 cartas aleatorias (3 para cada jugador)
    const todasLasCartas = generarCartasAleatorias(6);

    const jugadorHumano: Jugador = {
      id: 'humano',
      nombre: 'Vos',
      equipo: 0,
      cartas: todasLasCartas.slice(0, 3),
    };

    const jugadorIA: Jugador = {
      id: 'ia',
      nombre: `IA (${dificultad})`,
      equipo: 1,
      cartas: todasLasCartas.slice(3, 6),
      ia: dificultad,
    };

    const nuevaPartida: EstadoPartida = {
      jugadores: [jugadorHumano, jugadorIA],
      turnoActual: 0, // El humano siempre es mano primero
      manoActual: 0,
      historialRondas: [],
      puntos: [0, 0],
    };

    setEstado(nuevaPartida);
    setCartasJugadas([]);
    setRondaActual(0);
  }, [dificultad]);

  useEffect(() => {
    if (!estado) return;
    const jugador = estado.jugadores[estado.turnoActual];
    
    // Si hay cantos pendientes y es turno del humano, mostrar botones de respuesta
    const ultimaRonda = estado.historialRondas.at(-1);
    if (ultimaRonda && ultimaRonda.estado === 'pendiente' && ultimaRonda.jugadorQueCanto !== 'humano' && estado.turnoActual === 0) {
      setMostrarRespuesta(true);
      return;
    }
    
    // Si hay cantos pendientes y es turno de la IA, no hacer nada
    if (ultimaRonda && ultimaRonda.estado === 'pendiente' && ultimaRonda.jugadorQueCanto === 'humano' && estado.turnoActual === 1) {
      return; // La IA responderá en el siguiente useEffect
    }
    
    // Si no es turno de la IA, no hacer nada
    if (!jugador.ia) return;

    // Esperar un momento antes de que la IA juegue
    const timeoutId = setTimeout(() => {
      const nuevoEstado =
        jugador.ia === 'facil'
          ? jugarFacil(estado, jugador.id)
          : jugarDificil(estado, jugador.id);

      // Verificar si la IA jugó una carta
      const jugadorAntes = estado.jugadores.find(j => j.id === jugador.id);
      const jugadorDespues = nuevoEstado.jugadores.find(j => j.id === jugador.id);
      
      if (jugadorAntes && jugadorDespues && jugadorAntes.cartas.length > jugadorDespues.cartas.length) {
        // Encontrar la carta que ya no está en las cartas
        const cartaJugada = jugadorAntes.cartas.find(c => !jugadorDespues.cartas.includes(c));
        if (cartaJugada) {
          setCartasJugadas(prev => [...prev, { jugadorId: jugador.id, carta: cartaJugada, ronda: rondaActual }]);
        }
      }

      // Verificar si ha cambiado el estado de alguna ronda o se ha añadido una nueva
      if (nuevoEstado.historialRondas.length > estado.historialRondas.length) {
        // La IA cantó algo nuevo
        setMostrarRespuesta(true);
      }

      setEstado(nuevoEstado);
    }, 1000); // ⏱ Delay de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [estado?.turnoActual, estado?.historialRondas]);

  // Efecto para actualizar puntos cuando se aceptan o rechazan cantos
  useEffect(() => {
    if (!estado) return;
    
    const ultimaRonda = estado.historialRondas.at(-1);
    if (!ultimaRonda || ultimaRonda.estado === 'pendiente') return;
    
    // Si la ronda se acaba de aceptar o rechazar, actualizar puntos
    if (ultimaRonda.estado === 'aceptado' || ultimaRonda.estado === 'rechazado') {
      let nuevosPuntos = [...estado.puntos];
      
      // Determinar quién gana los puntos (equipo 0 o 1)
      if (['envido', 'realenvido', 'faltaenvido'].includes(ultimaRonda.tipo)) {
        if (ultimaRonda.estado === 'rechazado') {
          // Si se rechaza, gana puntos quien cantó
          const jugadorQueCanto = estado.jugadores.find(j => j.id === ultimaRonda.jugadorQueCanto);
          if (jugadorQueCanto) {
            const puntos = puntosPorNoQuieroEnvido(estado.historialRondas);
            nuevosPuntos[jugadorQueCanto.equipo] += puntos;
          }
        }
        // Si se acepta, los puntos se asignarán cuando se calculen valores de envido
      } else if (['truco', 'retruco', 'valecuatro'].includes(ultimaRonda.tipo)) {
        if (ultimaRonda.estado === 'rechazado') {
          // Si se rechaza, gana puntos quien cantó
          const jugadorQueCanto = estado.jugadores.find(j => j.id === ultimaRonda.jugadorQueCanto);
          if (jugadorQueCanto) {
            const puntos = puntosPorNoQuieroTruco(estado.historialRondas);
            nuevosPuntos[jugadorQueCanto.equipo] += puntos;
          }
        }
        // Si se acepta, los puntos se asignarán al final de la mano
      }
      
      // Actualizar el estado con los nuevos puntos
      if (nuevosPuntos[0] !== estado.puntos[0] || nuevosPuntos[1] !== estado.puntos[1]) {
        setEstado({
          ...estado,
          puntos: nuevosPuntos
        });
      }
    }
  }, [estado?.historialRondas]);

  // Efecto para controlar el fin de cada ronda de cartas
  useEffect(() => {
    if (!estado) return;
    
    // Determinar si se completó una ronda (ambos jugadores tiraron carta)
    const cartasRondaActual = cartasJugadas.filter(c => c.ronda === rondaActual);
    
    if (cartasRondaActual.length === 2) {
      // Avanzar a la siguiente ronda después de un breve delay
      const timeoutId = setTimeout(() => {
        setRondaActual(prev => prev + 1);
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [cartasJugadas, rondaActual]);

  const handleJugarCarta = (carta: string) => {
    if (!estado) return;
    const jugador = estado.jugadores[0];
    
    // No permitir jugar si no es tu turno o si hay una ronda pendiente
    const ultimaRonda = estado.historialRondas.at(-1);
    if (estado.turnoActual !== 0 || (ultimaRonda && ultimaRonda.estado === 'pendiente') || !jugador.cartas.includes(carta)) return;

    const nuevasCartas = jugador.cartas.filter(c => c !== carta);
    const nuevoJugador = { ...jugador, cartas: nuevasCartas };

    const nuevoEstado: EstadoPartida = {
      ...estado,
      jugadores: [nuevoJugador, estado.jugadores[1]],
      turnoActual: 1,
    };

    setEstado(nuevoEstado);
    setCartasJugadas(prev => [...prev, { jugadorId: 'humano', carta, ronda: rondaActual }]);
  };

  const handleCanto = (tipo: Ronda['tipo']) => {
    if (!estado) return;
    const nuevoEstado = agregarRonda(estado, 'humano', tipo);
    setEstado({ ...nuevoEstado, turnoActual: 1 });
    setMostrarRespuesta(false);
  };

  const handleRespuesta = (aceptar: boolean) => {
    if (!estado) return;
    const nuevoEstado = aceptar ? aceptarUltimaRonda(estado) : rechazarUltimaRonda(estado);
    setEstado({ ...nuevoEstado, turnoActual: estado.turnoActual === 0 ? 1 : 0 });
    setMostrarRespuesta(false);
  };

  // Verificar si se puede cantar envido (solo en la primera mano)
  const puedeCantar = (tipo: string): boolean => {
    if (!estado) return false;
    
    // Si hay una ronda pendiente, no se puede cantar nada
    const ultimaRonda = estado.historialRondas.at(-1);
    if (ultimaRonda && ultimaRonda.estado === 'pendiente') return false;
    
    // Verificar si ya se jugó alguna carta (no permitir envido después de la primera carta)
    const seJugoAlgunaCartaEstaMano = cartasJugadas.length > 0;
    
    switch (tipo) {
      case 'envido':
        return puedeCantarEnvido(estado, 'humano') && !seJugoAlgunaCartaEstaMano;
      case 'realenvido':
        return puedeCantarRealEnvido(estado, 'humano') && !seJugoAlgunaCartaEstaMano;
      case 'faltaenvido':
        return puedeCantarFaltaEnvido(estado, 'humano') && !seJugoAlgunaCartaEstaMano;
      case 'truco':
        return puedeCantarTruco(estado, 'humano');
      case 'retruco':
        return puedeCantarRetruco(estado, 'humano');
      case 'valecuatro':
        return puedeCantarValeCuatro(estado, 'humano');
      default:
        return false;
    }
  };

  // Obtener las cartas jugadas por cada jugador agrupadas por ronda
  const obtenerCartasPorRonda = () => {
    const resultado: Array<{humano: string | null, ia: string | null}> = [];
    
    // Obtener el número máximo de rondas
    const maxRonda = Math.max(...cartasJugadas.map(c => c.ronda), 0);
    
    // Para cada ronda, obtener las cartas
    for (let i = 0; i <= maxRonda; i++) {
      const cartasRonda = cartasJugadas.filter(c => c.ronda === i);
      const cartaHumano = cartasRonda.find(c => c.jugadorId === 'humano')?.carta || null;
      const cartaIA = cartasRonda.find(c => c.jugadorId === 'ia')?.carta || null;
      
      resultado.push({ humano: cartaHumano, ia: cartaIA });
    }
    
    return resultado;
  };

  const cartasPorRonda = obtenerCartasPorRonda();
  const ultimaRonda = estado?.historialRondas.at(-1);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Jugar Offline ({dificultad})</h1>

      {!estado ? (
        <p>Cargando partida...</p>
      ) : (
        <div>
          <div className="puntaje">
            <p className="puntaje-equipo"><strong>Tu puntaje:</strong> {estado.puntos[0]}</p>
            <p className="puntaje-equipo"><strong>Puntaje IA:</strong> {estado.puntos[1]}</p>
          </div>
          
          <p><strong>Turno de:</strong> {estado.jugadores[estado.turnoActual].nombre}</p>

          {/* Jugador IA */}
          <div style={{ marginTop: '2rem' }}>
            <h2>{estado.jugadores[1].nombre}</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {estado.jugadores[1].cartas.map((_, index) => (
                <div key={index} className="carta tapada">🂠</div>
              ))}
            </div>
          </div>

          {/* MESA CENTRAL - Mostrar todas las rondas */}
          <div className="mesa-container">
            {cartasPorRonda.map((ronda, index) => (
              <div key={index} className="mesa">
                <div className="jugador-mesa">
                  <h3>{estado.jugadores[1].nombre}</h3>
                  {ronda.ia ? (
                    <div className="carta carta-mesa">{ronda.ia}</div>
                  ) : (
                    <div className="carta-placeholder">—</div>
                  )}
                </div>
                
                <div className="jugador-mesa">
                  <h3>{estado.jugadores[0].nombre}</h3>
                  {ronda.humano ? (
                    <div className="carta carta-mesa">{ronda.humano}</div>
                  ) : (
                    <div className="carta-placeholder">—</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Añadir una nueva mesa si se necesita */}
            {cartasPorRonda.length <= rondaActual && (
              <div className="mesa">
                <div className="jugador-mesa">
                  <h3>{estado.jugadores[1].nombre}</h3>
                  <div className="carta-placeholder">—</div>
                </div>
                
                <div className="jugador-mesa">
                  <h3>{estado.jugadores[0].nombre}</h3>
                  <div className="carta-placeholder">—</div>
                </div>
              </div>
            )}
          </div>

          {/* Información de cantos */}
          {ultimaRonda && (
            <div className="info-cantos">
              <p><strong>{ultimaRonda.jugadorQueCanto === 'humano' ? 'Vos' : 'IA'} cantó:</strong> {ultimaRonda.tipo} - 
                 {ultimaRonda.estado === 'pendiente' ? ' Pendiente' : 
                  ultimaRonda.estado === 'aceptado' ? ' Aceptado' : ' Rechazado'}</p>
            </div>
          )}

          {/* Botones de respuesta */}
          {mostrarRespuesta && ultimaRonda && ultimaRonda.estado === 'pendiente' && (
            <div className="respuesta-cantos">
              <h3>Responder a: {ultimaRonda.tipo}</h3>
              <div className="botones-respuesta">
                <button onClick={() => handleRespuesta(true)} className="btn-quiero">Quiero</button>
                <button onClick={() => handleRespuesta(false)} className="btn-no-quiero">No Quiero</button>
              </div>
            </div>
          )}

          {/* Cantos disponibles */}
          {estado.turnoActual === 0 && !mostrarRespuesta && (
            <div className="cantos">
              <button 
                onClick={() => handleCanto('envido')} 
                disabled={!puedeCantar('envido')}
                className={puedeCantar('envido') ? '' : 'deshabilitado'}
              >
                Envido
              </button>
              <button 
                onClick={() => handleCanto('realenvido')} 
                disabled={!puedeCantar('realenvido')}
                className={puedeCantar('realenvido') ? '' : 'deshabilitado'}
              >
                Real Envido
              </button>
              <button 
                onClick={() => handleCanto('faltaenvido')} 
                disabled={!puedeCantar('faltaenvido')}
                className={puedeCantar('faltaenvido') ? '' : 'deshabilitado'}
              >
                Falta Envido
              </button>
              <button 
                onClick={() => handleCanto('truco')} 
                disabled={!puedeCantar('truco')}
                className={puedeCantar('truco') ? '' : 'deshabilitado'}
              >
                Truco
              </button>
              <button 
                onClick={() => handleCanto('retruco')} 
                disabled={!puedeCantar('retruco')}
                className={puedeCantar('retruco') ? '' : 'deshabilitado'}
              >
                Re Truco
              </button>
              <button 
                onClick={() => handleCanto('valecuatro')} 
                disabled={!puedeCantar('valecuatro')}
                className={puedeCantar('valecuatro') ? '' : 'deshabilitado'}
              >
                Vale Cuatro
              </button>
            </div>
          )}

          {/* Jugador Humano */}
          <div style={{ marginTop: '4rem' }}>
            <h2>{estado.jugadores[0].nombre}</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {estado.jugadores[0].cartas.map((carta, index) => (
                <div
                  key={index}
                  className={`carta ${estado.turnoActual !== 0 || mostrarRespuesta ? 'deshabilitada' : ''}`}
                  onClick={() => handleJugarCarta(carta)}
                >
                  {carta}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JugarOffline;