export type JugadorID = string;
export type Accion = EstadoPartida;

export type Jugador = {
  id: string;
  nombre: string;
  equipo: number;
  cartas: string[];
  ia?: 'facil' | 'dificil';
};


export type Ronda = {
  jugadorQueCanto: string;
  tipo: 'envido' | 'realenvido' | 'faltaenvido' | 'truco' | 'retruco' | 'valecuatro';
  estado: 'pendiente' | 'aceptado' | 'rechazado';
};

export type EstadoPartida = {
  jugadores: Jugador[];
  turnoActual: number;
  manoActual: number;
  historialRondas: Ronda[];
  puntos: number[];
};

export function puntosPorEnvido(historial: Ronda[], puntosEquipo1: number, puntosEquipo2: number): number {
  let puntos = 0;
  let falta = false;

  for (const ronda of historial) {
    if (ronda.tipo === 'faltaenvido') {
      falta = true;
    }
  }

  if (falta) {
    return 30 - Math.max(puntosEquipo1, puntosEquipo2);
  }

  for (const ronda of historial) {
    if (ronda.estado === 'aceptado') {
      switch (ronda.tipo) {
        case 'envido':
          puntos += 2;
          break;
        case 'realenvido':
          puntos += 3;
          break;
      }
    }
  }

  return puntos;
}

export function puntosPorNoQuieroEnvido(historial: Ronda[]): number {
  let ultimoIndice = historial.length - 1;
  for (let i = ultimoIndice; i >= 0; i--) {
    if (historial[i].estado === 'pendiente') continue;
    if (historial[i].estado === 'rechazado') {
      let puntos = 0;
      for (let j = 0; j < i; j++) {
        if (historial[j].estado === 'aceptado') {
          switch (historial[j].tipo) {
            case 'envido':
              puntos = 1;
              break;
            case 'realenvido':
              puntos = 2;
              break;
            case 'faltaenvido':
              puntos = 1;
              break;
          }
        }
      }
      return puntos;
    }
  }
  return 0;
}

export function puntosPorNoQuieroTruco(historial: Ronda[]): number {
  for (let i = historial.length - 1; i >= 0; i--) {
    const ronda = historial[i];
    if (ronda.estado === 'rechazado') {
      if (ronda.tipo === 'truco') return 1;
      if (ronda.tipo === 'retruco') return 2;
      if (ronda.tipo === 'valecuatro') return 3;
    }
  }
  return 0;
}

export function puedeCantarTruco(estado: EstadoPartida, jugadorId: string): boolean {
  return estado.jugadores[estado.turnoActual].id === jugadorId &&
    !estado.historialRondas.some(r => ['truco', 'retruco', 'valecuatro'].includes(r.tipo));
}

export function puedeCantarRetruco(estado: EstadoPartida, jugadorId: string): boolean {
  const truco = estado.historialRondas.find(r => r.tipo === 'truco' && r.estado === 'aceptado');
  const yaCantado = estado.historialRondas.some(r => r.tipo === 'retruco');
  return truco !== undefined && !yaCantado && estado.jugadores[estado.turnoActual].id === jugadorId;
}

export function puedeCantarValeCuatro(estado: EstadoPartida, jugadorId: string): boolean {
  const retruco = estado.historialRondas.find(r => r.tipo === 'retruco' && r.estado === 'aceptado');
  const yaCantado = estado.historialRondas.some(r => r.tipo === 'valecuatro');
  return retruco !== undefined && !yaCantado && estado.jugadores[estado.turnoActual].id === jugadorId;
}

export function puedeCantarEnvido(estado: EstadoPartida, jugadorId: string): boolean {
  const yaSeCantoEnvido = estado.historialRondas.some(r => ['envido', 'realenvido', 'faltaenvido'].includes(r.tipo));
  const yaSeCantoTruco = estado.historialRondas.some(r => ['truco', 'retruco', 'valecuatro'].includes(r.tipo));
  return !yaSeCantoEnvido && !yaSeCantoTruco && estado.jugadores[estado.turnoActual].id === jugadorId;
}

export function puedeCantarRealEnvido(estado: EstadoPartida, jugadorId: string): boolean {
  const yaSeCantoTruco = estado.historialRondas.some(r => ['truco', 'retruco', 'valecuatro'].includes(r.tipo));
  return !yaSeCantoTruco && estado.jugadores[estado.turnoActual].id === jugadorId;
}

export function puedeCantarFaltaEnvido(estado: EstadoPartida, jugadorId: string): boolean {
  const yaSeCantoTruco = estado.historialRondas.some(r => ['truco', 'retruco', 'valecuatro'].includes(r.tipo));
  return !yaSeCantoTruco && estado.jugadores[estado.turnoActual].id === jugadorId;
}

export function agregarRonda(estado: EstadoPartida, jugadorId: string, tipo: Ronda['tipo']): EstadoPartida {
  return {
    ...estado,
    historialRondas: [
      ...estado.historialRondas,
      {
        jugadorQueCanto: jugadorId,
        tipo,
        estado: 'pendiente',
      },
    ],
  };
}

export function aceptarUltimaRonda(estado: EstadoPartida): EstadoPartida {
  if (estado.historialRondas.length === 0) {
    throw new Error('No hay rondas en el historial para aceptar.');
  }
  const index = estado.historialRondas.length - 1;
  const nuevaRonda: Ronda = { ...estado.historialRondas[index], estado: 'aceptado' };
  const nuevoHistorial = [...estado.historialRondas];
  nuevoHistorial[index] = nuevaRonda;
  return {
    ...estado,
    historialRondas: nuevoHistorial,
  };
}

export function rechazarUltimaRonda(estado: EstadoPartida): EstadoPartida {
  if (estado.historialRondas.length === 0) {
    throw new Error('No hay rondas en el historial para rechazar.');
  }
  const index = estado.historialRondas.length - 1;
  const nuevaRonda: Ronda = { ...estado.historialRondas[index], estado: 'rechazado' };
  const nuevoHistorial = [...estado.historialRondas];
  nuevoHistorial[index] = nuevaRonda;
  return {
    ...estado,
    historialRondas: nuevoHistorial,
  };
}
export function puedeJugarCarta(estado: EstadoPartida, jugadorId: string): boolean {
  const jugador = estado.jugadores.find(j => j.id === jugadorId);
  return estado.jugadores[estado.turnoActual].id === jugadorId && jugador?.cartas.length! > 0;
}

export function jugarCarta(estado: EstadoPartida, jugadorId: string, carta: string): EstadoPartida {
  if (!puedeJugarCarta(estado, jugadorId)) return estado;

  const jugadoresActualizados = estado.jugadores.map(j => {
    if (j.id === jugadorId) {
      return {
        ...j,
        cartas: j.cartas.filter(c => c !== carta),
      };
    }
    return j;
  });

  // Avanzar el turno
  const siguienteTurno = (estado.turnoActual + 1) % estado.jugadores.length;

  return {
    ...estado,
    jugadores: jugadoresActualizados,
    turnoActual: siguienteTurno,
  };
}
