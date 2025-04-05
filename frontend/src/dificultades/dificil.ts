// src/dificultades/dificil.ts
import {
  puedeCantarEnvido,
  puedeCantarRealEnvido,
  puedeCantarFaltaEnvido,
  puedeCantarTruco,
  puedeCantarRetruco,
  puedeCantarValeCuatro,
  agregarRonda,
  aceptarUltimaRonda,
  rechazarUltimaRonda,
  puedeJugarCarta,
  jugarCarta,
  EstadoPartida,
} from '../game/Logic';

function jugarDificil(estado: EstadoPartida, jugadorId: string): EstadoPartida {
  let nuevoEstado = { ...estado };

  const jugador = nuevoEstado.jugadores.find(j => j.id === jugadorId)!;
  const equipo = jugador.equipo;
  const puntosPropios = nuevoEstado.puntos[equipo];
  const puntosEnemigos = nuevoEstado.puntos[1 - equipo];

  const ultimaRonda = nuevoEstado.historialRondas.at(-1);

  // === RESPONDER RONDA ===
  if (ultimaRonda && ultimaRonda.estado === 'pendiente' && ultimaRonda.jugadorQueCanto !== jugadorId) {
    const riesgo = calcularRiesgo(ultimaRonda.tipo, puntosPropios, puntosEnemigos);
    const acepto = Math.random() < (1 - riesgo);
    return acepto ? aceptarUltimaRonda(nuevoEstado) : rechazarUltimaRonda(nuevoEstado);
  }

  // === EVALUAR CANTAR ===
  const jugadas = [];

  if (puedeCantarValeCuatro(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'valecuatro', peso: 0.7 });
  if (puedeCantarRetruco(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'retruco', peso: 0.6 });
  if (puedeCantarTruco(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'truco', peso: 0.5 });

  if (puedeCantarFaltaEnvido(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'faltaenvido', peso: 0.65 });
  if (puedeCantarRealEnvido(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'realenvido', peso: 0.5 });
  if (puedeCantarEnvido(nuevoEstado, jugadorId)) jugadas.push({ tipo: 'envido', peso: 0.4 });

  // Ordenar por peso descendente y seleccionar con probabilidad
  jugadas.sort((a, b) => b.peso - a.peso);

  for (const jugada of jugadas) {
    const chance = jugada.peso + (puntosPropios > 24 ? 0.2 : 0);
    if (Math.random() < chance) {
      return agregarRonda(nuevoEstado, jugadorId, jugada.tipo as any);
    }
  }

// No canta ni responde: intenta jugar una carta
if (jugador.cartas.length > 0) {
  const cartaElegida = jugador.cartas[jugador.cartas.length - 1];
  return jugarCarta(nuevoEstado, jugadorId, cartaElegida);
}

return nuevoEstado; // No puede jugar


}

function calcularRiesgo(tipo: string, propios: number, enemigos: number): number {
  switch (tipo) {
    case 'truco': return enemigos > propios ? 0.5 : 0.3;
    case 'retruco': return enemigos > propios ? 0.7 : 0.4;
    case 'valecuatro': return enemigos > propios ? 0.9 : 0.5;
    case 'envido': return 0.3;
    case 'realenvido': return 0.5;
    case 'faltaenvido': return enemigos > 24 ? 0.95 : 0.7;
    default: return 0.5;
  }
}

export default jugarDificil;
