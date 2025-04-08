import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { iniciarPartidaOffline, actualizarEstado } from '../game/offline'; // Importar lógica de offline.js
import { generarCartasAleatorias } from '../game/random'; // Importar lógica de random.js
import { jugarDificil } from '../game/ia'; // Importar lógica de ia.js
import './JugarOffline.css';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const JugarOffline: React.FC = () => {
  const query = useQuery();
  const dificultad = query.get('dificultad') as 'facil' | 'dificil' | null;

  const [estado, setEstado] = useState<any>(null); // Estado del juego
  const [cartasJugadas, setCartasJugadas] = useState<Array<{ jugadorId: string; carta: string }>>([]);
  const [mostrarRespuesta, setMostrarRespuesta] = useState<boolean>(false);

  useEffect(() => {
    if (!dificultad) return;

    // Generar cartas aleatorias
    const todasLasCartas = generarCartasAleatorias(6);

    // Inicializar partida offline
    const jugadorHumano = {
      id: 'humano',
      nombre: 'Vos',
      equipo: 0,
      cartas: todasLasCartas.slice(0, 3),
    };

    const jugadorIA = {
      id: 'ia',
      nombre: `IA (${dificultad})`,
      equipo: 1,
      cartas: todasLasCartas.slice(3, 6),
      ia: dificultad,
    };

    const nuevaPartida = iniciarPartidaOffline([jugadorHumano, jugadorIA]);
    setEstado(nuevaPartida);
    setCartasJugadas([]);
  }, [dificultad]);

  useEffect(() => {
    if (!estado) return;

    const jugador = estado.jugadores[estado.turnoActual];

    // Si hay una ronda pendiente y es el turno de la IA, mostrar botones de respuesta
    const ultimaRonda = estado.historialRondas.at(-1);
    if (ultimaRonda && ultimaRonda.estado === 'pendiente' && ultimaRonda.jugadorQueCanto !== 'humano' && estado.turnoActual === 0) {
      setMostrarRespuesta(true);
      return;
    }

    if (!jugador.ia) return;

    const timeoutId = setTimeout(() => {
      const nuevoEstado =
        jugador.ia === 'facil'
          ? actualizarEstado(estado, jugador.id) // Lógica para IA fácil
          : jugarDificil(estado, jugador.id); // Lógica para IA difícil

      setEstado(nuevoEstado);
    }, 1000); // ⏱ Delay de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [estado]);

  const handleJugarCarta = (carta: string) => {
    if (!estado) return;

    const nuevoEstado = actualizarEstado(estado, 'humano', carta); // Actualizar estado con offline.js
    setEstado(nuevoEstado);
    setCartasJugadas((prev) => [...prev, { jugadorId: 'humano', carta }]);
  };

  const handleCanto = (tipo: string) => {
    if (!estado) return;

    const nuevoEstado = actualizarEstado(estado, 'humano', null, tipo); // Manejar cantos con offline.js
    setEstado(nuevoEstado);
    setMostrarRespuesta(false);
  };

  const handleRespuesta = (aceptar: boolean) => {
    if (!estado) return;

    const nuevoEstado = actualizarEstado(estado, 'humano', null, null, aceptar); // Manejar respuesta con offline.js
    setEstado(nuevoEstado);
    setMostrarRespuesta(false);
  };

  const cartasEnMesa = cartasJugadas.reduce(
    (acc, carta) => {
      acc[carta.jugadorId === 'humano' ? 'humano' : 'ia'] = carta.carta || null;
      return acc;
    },
    { humano: null, ia: null }
  );

  const ultimaRonda = estado?.historialRondas.at(-1);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Jugar Offline ({dificultad})</h1>

      {!estado ? (
        <p>Cargando partida...</p>
      ) : (
        <div>
          <p>
            <strong>Turno de:</strong> {estado.jugadores[estado.turnoActual].nombre}
          </p>

          {/* Jugador IA */}
          <div style={{ marginTop: '2rem' }}>
            <h2>{estado.jugadores[1].nombre}</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {estado.jugadores[1].cartas.map((_, index) => (
                <div key={index} className="carta tapada">
                  🂠
                </div>
              ))}
            </div>
          </div>

          {/* MESA CENTRAL */}
          <div className="mesa">
            <div className="jugador-mesa">
              <h3>{estado.jugadores[1].nombre}</h3>
              {cartasEnMesa.ia ? (
                <div className="carta carta-mesa">{cartasEnMesa.ia}</div>
              ) : (
                <div className="carta-placeholder">—</div>
              )}
            </div>

            <div className="jugador-mesa">
              <h3>{estado.jugadores[0].nombre}</h3>
              {cartasEnMesa.humano ? (
                <div className="carta carta-mesa">{cartasEnMesa.humano}</div>
              ) : (
                <div className="carta-placeholder">—</div>
              )}
            </div>
          </div>

          {/* Información de cantos */}
          {ultimaRonda && (
            <div className="info-cantos">
              <p>
                <strong>{ultimaRonda.jugadorQueCanto === 'humano' ? 'Vos' : 'IA'} cantó:</strong> {ultimaRonda.tipo} -{' '}
                {ultimaRonda.estado === 'pendiente'
                  ? ' Pendiente'
                  : ultimaRonda.estado === 'aceptado'
                  ? ' Aceptado'
                  : ' Rechazado'}
              </p>
            </div>
          )}

          {/* Botones de respuesta */}
          {mostrarRespuesta && ultimaRonda && ultimaRonda.estado === 'pendiente' && (
            <div className="respuesta-cantos">
              <h3>Responder a: {ultimaRonda.tipo}</h3>
              <div className="botones-respuesta">
                <button onClick={() => handleRespuesta(true)} className="btn-quiero">
                  Quiero
                </button>
                <button onClick={() => handleRespuesta(false)} className="btn-no-quiero">
                  No Quiero
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JugarOffline;