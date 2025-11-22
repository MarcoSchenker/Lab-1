const RondaEnvidoHandler = require('../game-logic/RondaEnvidoHandler');

const createMockRonda = (overrides = {}) => {
  const baseEquipos = [
    { id: 'equipo_1', nombre: 'Equipo 1', puntosPartida: 0, jugadores: [{ id: '1' }] },
    { id: 'equipo_2', nombre: 'Equipo 2', puntosPartida: 0, jugadores: [{ id: '2' }] }
  ];

  const ronda = {
    jugadoresEnOrden: [
      { id: '1', equipoId: 'equipo_1', esPie: true },
      { id: '2', equipoId: 'equipo_2', esPie: true }
    ],
    equipos: baseEquipos,
    partida: { puntosVictoria: 15, equipos: baseEquipos },
    notificarEstado: jest.fn(),
    persistirAccion: jest.fn(),
    _actualizarEstadoParaNotificar: jest.fn(),
    turnoHandler: {
      manoActualNumero: 1,
      cartasEnMesaManoActual: [],
      jugadorTurnoActual: { id: '1' },
      jugadorTurnoAlMomentoDelCantoId: null,
      guardarTurnoAntesCanto: jest.fn(function guardar() {
        this.jugadorTurnoAlMomentoDelCantoId = this.jugadorTurnoActual?.id ?? null;
        return this.jugadorTurnoAlMomentoDelCantoId;
      }),
      setTurnoA: jest.fn()
    },
    trucoHandler: {
      estadoResolucion: 'no_cantado',
      querido: null,
      estaPendienteDeRespuesta: jest.fn(() => false)
    },
    trucoPendientePorEnvidoPrimero: false
  };

  return {
    ...ronda,
    ...overrides,
    turnoHandler: { ...ronda.turnoHandler, ...(overrides.turnoHandler || {}) },
    trucoHandler: { ...ronda.trucoHandler, ...(overrides.trucoHandler || {}) }
  };
};

describe('Interacción Envido/Truco en RondaEnvidoHandler', () => {
  test('habilita "envido va primero" cuando hay truco pendiente en primera mano', () => {
    const ronda = createMockRonda({
      trucoHandler: {
        estadoResolucion: 'cantado_pendiente_respuesta',
        querido: null,
        estaPendienteDeRespuesta: jest.fn(() => true)
      },
      trucoPendientePorEnvidoPrimero: true
    });

    const envidoHandler = new RondaEnvidoHandler(ronda);
    const result = envidoHandler.registrarCanto('1', 'ENVIDO');

    expect(result).toBe(true);
    expect(ronda.trucoPendientePorEnvidoPrimero).toBe(true);
    expect(ronda.turnoHandler.guardarTurnoAntesCanto).toHaveBeenCalled();
    expect(ronda.turnoHandler.setTurnoA).toHaveBeenCalledWith('2');
  });

  test('bloquea nuevos cantos de envido después de que el truco fue aceptado', () => {
    const ronda = createMockRonda({
      trucoHandler: {
        estadoResolucion: 'querido',
        querido: true,
        estaPendienteDeRespuesta: jest.fn(() => false)
      }
    });

    const envidoHandler = new RondaEnvidoHandler(ronda);
    const result = envidoHandler.registrarCanto('1', 'ENVIDO');

    expect(result).toBe(false);
    expect(ronda.notificarEstado).toHaveBeenCalledWith(
      'error_accion_juego',
      expect.objectContaining({ mensaje: 'No se puede cantar envido en este momento.' })
    );
  });
});
