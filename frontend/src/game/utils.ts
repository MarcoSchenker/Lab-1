// utils.ts - Funciones de utilidad para el juego de Truco

import { Carta, Palo, Jugador, Equipo } from './models';
import { EstadoEnvido, EstadoTruco } from './game-state';

// Función para obtener el nombre legible de un palo
export function nombrePalo(palo: Palo): string {
  switch (palo) {
    case Palo.ORO: return 'Oro';
    case Palo.COPA: return 'Copa';
    case Palo.ESPADA: return 'Espada';
    case Palo.BASTO: return 'Basto';
    default: return 'Desconocido';
  }
}

// Función para obtener el nombre legible de una carta
export function nombreCarta(carta: Carta): string {
  let nombreNumero: string;
  
  switch (carta.numero) {
    case 1: nombreNumero = 'As'; break;
    case 10: nombreNumero = 'Sota'; break;
    case 11: nombreNumero = 'Caballo'; break;
    case 12: nombreNumero = 'Rey'; break;
    default: nombreNumero = `${carta.numero}`; break;
  }
  
  return `${nombreNumero} de ${nombrePalo(carta.palo)}`;
}

// Función para obtener el nombre del estado del envido
export function nombreEstadoEnvido(estado: EstadoEnvido): string {
  switch (estado) {
    case EstadoEnvido.NO_CANTADO: return 'No cantado';
    case EstadoEnvido.ENVIDO: return 'Envido';
    case EstadoEnvido.ENVIDO_ENVIDO: return 'Envido Envido';
    case EstadoEnvido.REAL_ENVIDO: return 'Real Envido';
    case EstadoEnvido.FALTA_ENVIDO: return 'Falta Envido';
    default: return 'Desconocido';
  }
}

// Función para obtener el nombre del estado del truco
export function nombreEstadoTruco(estado: EstadoTruco): string {
  switch (estado) {
    case EstadoTruco.NO_CANTADO: return 'No cantado';
    case EstadoTruco.TRUCO: return 'Truco';
    case EstadoTruco.RETRUCO: return 'Retruco';
    case EstadoTruco.VALE_CUATRO: return 'Vale Cuatro';
    default: return 'Desconocido';
  }
}

// Función para calcular el valor del envido para una combinación de cartas
export function calcularEnvido(cartas: Carta[]): number {
  // Agrupar cartas por palo
  const cartasPorPalo = new Map<Palo, Carta[]>();
  
  for (const carta of cartas) {
    if (!cartasPorPalo.has(carta.palo)) {
      cartasPorPalo.set(carta.palo, []);
    }
    cartasPorPalo.get(carta.palo)!.push(carta);
  }
  
  let mejorPuntaje = 0;
  
  // Calcular el mejor puntaje de envido
  for (const [palo, cartasMismoPalo] of cartasPorPalo.entries()) {
    if (cartasMismoPalo.length >= 2) {
      // Ordenar por valor de envido (del 1 al 7, 10-12 valen 0)
      const valoresEnvido = cartasMismoPalo.map(c => {
        // Para el envido, las figuras (10, 11, 12) valen 0
        return c.numero <= 7 ? c.numero : 0;
      }).sort((a, b) => b - a);
      
      // Tomar los dos mayores valores y sumar 20
      const puntaje = 20 + valoresEnvido[0] + valoresEnvido[1];
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
      }
    } else if (cartasMismoPalo.length === 1) {
      // Si solo hay una carta del palo, su valor es solo el número (figuras valen 0)
      const valor = cartasMismoPalo[0].numero <= 7 ? cartasMismoPalo[0].numero : 0;
      if (valor > mejorPuntaje) {
        mejorPuntaje = valor;
      }
    }
  }
  
  return mejorPuntaje;
}

// Función para determinar si un jugador es del mismo equipo que otro
export function sonMismoEquipo(jugador1: Jugador, jugador2: Jugador, equipos: Equipo[]): boolean {
  for (const equipo of equipos) {
    const jugadores = equipo.getJugadores();
    const tieneJugador1 = jugadores.some(j => j.id === jugador1.id);
    const tieneJugador2 = jugadores.some(j => j.id === jugador2.id);
    
    if (tieneJugador1 && tieneJugador2) {
      return true;
    }
  }
  
  return false;
}

// Función para obtener el equipo al que pertenece un jugador
export function obtenerEquipo(jugador: Jugador, equipos: Equipo[]): Equipo | null {
  for (const equipo of equipos) {
    if (equipo.getJugadores().some(j => j.id === jugador.id)) {
      return equipo;
    }
  }
  
  return null;
}

// Función para formatear un historial de cantos para mostrar
export function formatearHistorialCantos(
  cantosEnvido: { canto: EstadoEnvido; equipo: Equipo }[],
  cantosTruco: { canto: EstadoTruco; equipo: Equipo }[]
): string {
  let resultado = "Historial de cantos:\n";
  
  if (cantosEnvido.length > 0) {
    resultado += "Envido:\n";
    for (const canto of cantosEnvido) {
      resultado += `- ${nombreEstadoEnvido(canto.canto)} (${canto.equipo.nombre})\n`;
    }
  }
  
  if (cantosTruco.length > 0) {
    resultado += "Truco:\n";
    for (const canto of cantosTruco) {
      resultado += `- ${nombreEstadoTruco(canto.canto)} (${canto.equipo.nombre})\n`;
    }
  }
  
  return resultado;
}

// Función para crear un ID único
export function generarId(): string {
  return Math.random().toString(36).substring(2, 9);
}