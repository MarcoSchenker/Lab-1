// src/dificultades/facil.ts
import {
  EstadoPartida,
  puedeCantarTruco,
  puedeCantarEnvido,
  puedeCantarRealEnvido,
  puedeCantarFaltaEnvido,
  puedeCantarRetruco,
  puedeCantarValeCuatro,
  agregarRonda,
  aceptarUltimaRonda,
  rechazarUltimaRonda,
  puedeJugarCarta,
  jugarCarta
} from '../game/Logic';

function jugarFacil(estado: EstadoPartida, jugadorId: string): EstadoPartida {
  let nuevoEstado = { ...estado };

  // Si hay una ronda pendiente, decide aceptar o rechazar aleatoriamente
  const ultimaRonda = nuevoEstado.historialRondas.at(-1);
  if (ultimaRonda && ultimaRonda.estado === 'pendiente' && ultimaRonda.jugadorQueCanto !== jugadorId) {
    const aceptar = Math.random() > 0.5;
    return aceptar ? aceptarUltimaRonda(nuevoEstado) : rechazarUltimaRonda(nuevoEstado);
  }

  // Probabilidad baja de cantar algo. Si puede, elige una al azar entre las opciones posibles.
  const opciones: { tipo: 'truco' | 'envido' | 'realenvido' | 'faltaenvido' | 'retruco' | 'valecuatro'; check: () => boolean }[] = [
    { tipo: 'truco', check: () => puedeCantarTruco(nuevoEstado, jugadorId) },
    { tipo: 'retruco', check: () => puedeCantarRetruco(nuevoEstado, jugadorId) },
    { tipo: 'valecuatro', check: () => puedeCantarValeCuatro(nuevoEstado, jugadorId) },
    { tipo: 'envido', check: () => puedeCantarEnvido(nuevoEstado, jugadorId) },
    { tipo: 'realenvido', check: () => puedeCantarRealEnvido(nuevoEstado, jugadorId) },
    { tipo: 'faltaenvido', check: () => puedeCantarFaltaEnvido(nuevoEstado, jugadorId) },
  ];

  // 30% de probabilidad de cantar algo si puede
  if (Math.random() < 0.3) {
    const cantables = opciones.filter(op => op.check());
    if (cantables.length > 0) {
      const elegida = cantables[Math.floor(Math.random() * cantables.length)];
      return agregarRonda(nuevoEstado, jugadorId, elegida.tipo);
    }
  }

  // No canta nada, intenta jugar carta
  const jugador = nuevoEstado.jugadores.find(j => j.id === jugadorId);
  if (jugador && jugador.cartas.length > 0 && puedeJugarCarta(nuevoEstado, jugadorId)) {
    // Juega la primera carta disponible
    const cartaElegida = jugador.cartas[0];
    return jugarCarta(nuevoEstado, jugadorId, cartaElegida);
  }

  // No puede hacer nada, pasa el turno (queda igual el estado)
  return nuevoEstado;
}

export default jugarFacil;