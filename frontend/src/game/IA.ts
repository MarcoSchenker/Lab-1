// src/game/IA.ts
import { EstadoPartida, JugadorID } from './Logic';
import jugarFacil from '../dificultades/facil';
import jugarDificil from '../dificultades/dificil';

// Tipo que representa una función de IA
export type IA = (estado: EstadoPartida, jugadorId: JugadorID) => EstadoPartida;

// Función que ejecuta la IA correspondiente según la dificultad
export function jugarIA(estado: EstadoPartida): EstadoPartida {
  const jugadorActual = estado.jugadores[estado.turnoActual];

  if (!jugadorActual.ia) {
    throw new Error('El jugador actual no es una IA.');
  }

  // Si hay una ronda pendiente que no fue iniciada por la IA, la IA debe responder
  const ultimaRonda = estado.historialRondas.at(-1);
  const esperandoRespuesta = ultimaRonda && 
                            ultimaRonda.estado === 'pendiente' && 
                            ultimaRonda.jugadorQueCanto !== jugadorActual.id;

  // Si no hay cartas para jugar o se espera una respuesta a un canto
  if (jugadorActual.cartas.length === 0 || esperandoRespuesta) {
    switch (jugadorActual.ia) {
      case 'facil':
        return jugarFacil(estado, jugadorActual.id);
      case 'dificil':
        return jugarDificil(estado, jugadorActual.id);
      default:
        throw new Error(`Dificultad de IA desconocida: ${jugadorActual.ia}`);
    }
  }

  // Si tiene cartas y no hay cantos pendientes, procede normalmente
  switch (jugadorActual.ia) {
    case 'facil':
      return jugarFacil(estado, jugadorActual.id);
    case 'dificil':
      return jugarDificil(estado, jugadorActual.id);
    default:
      throw new Error(`Dificultad de IA desconocida: ${jugadorActual.ia}`);
  }
}