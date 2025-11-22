const RondaGame = require('../game-logic/RondaGame');
const EquipoGame = require('../game-logic/EquipoGame');
const JugadorGame = require('../game-logic/JugadorGame');

const createCarta = (idUnico, numero, valorTrucoOverride) => ({
  idUnico,
  numero,
  palo: 'espada',
  valorTruco: valorTrucoOverride ?? numero,
  valorEnvido: numero >= 10 ? 0 : numero,
  estaJugada: false
});

const create1v1Ronda = () => {
  const equipo1 = new EquipoGame('equipo_1', 'Equipo 1');
  const equipo2 = new EquipoGame('equipo_2', 'Equipo 2');
  const jugador1 = new JugadorGame(1, 'Jugador 1', 'equipo_1');
  const jugador2 = new JugadorGame(2, 'Jugador 2', 'equipo_2');
  equipo1.agregarJugador(jugador1);
  equipo2.agregarJugador(jugador2);

  const partidaStub = {
    codigoSala: 'TEST_SALA',
    estadoPartida: 'en_juego',
    puntosVictoria: 30,
    equipos: [equipo1, equipo2]
  };

  const ronda = new RondaGame(
    1,
    [jugador1, jugador2],
    jugador1,
    [equipo1, equipo2],
    partidaStub,
    jest.fn(),
    jest.fn()
  );

  return { ronda, jugador1, jugador2 };
};

const asignarManosYResetearTurno = (ronda, cartasJugador1, cartasJugador2) => {
  const [jugadorMano, jugadorOponente] = ronda.jugadoresEnOrden;
  jugadorMano.recibirCartas(cartasJugador1);
  jugadorOponente.recibirCartas(cartasJugador2);

  ronda.turnoHandler.cartasEnMesaManoActual = [];
  ronda.turnoHandler.manosJugadas = [];
  ronda.turnoHandler.manoActualNumero = 1;
  ronda.turnoHandler.indiceJugadorTurnoActual = 0;
  ronda.turnoHandler.jugadorTurnoActual = jugadorMano;
  ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId = null;
};

describe('Gameplay flows 1v1 - Truco & Envido', () => {
  test('Flow 1: Truco first, Envido goes first, then Truco resolves', () => {
    const { ronda, jugador1, jugador2 } = create1v1Ronda();

    expect(ronda.manejarCanto(jugador1.id, 'TRUCO')).toBe(true);
    expect(ronda.trucoPendientePorEnvidoPrimero).toBe(true);

    expect(ronda.manejarCanto(jugador2.id, 'ENVIDO')).toBe(true);
    expect(ronda.envidoHandler.estadoResolucion).toBe('cantado_pendiente_respuesta');

    expect(ronda.manejarRespuestaCanto(jugador1.id, 'QUIERO')).toBe(true);
    expect(ronda.envidoHandler.declaracionEnCurso).toBe(true);

    expect(ronda.manejarDeclaracionPuntosEnvido(jugador1.id, 27)).toBe(true);
    expect(ronda.manejarDeclaracionPuntosEnvido(jugador2.id, 33)).toBe(true);
    expect(ronda.envidoHandler.estadoResolucion).toBe('resuelto');
    expect(ronda.puntosGanadosEnvido).toBeGreaterThan(0);
    expect(ronda.trucoPendientePorEnvidoPrimero).toBe(false);

    expect(ronda.trucoHandler.estadoResolucion).toBe('cantado_pendiente_respuesta');
    expect(ronda.manejarRespuestaCanto(jugador2.id, 'NO_QUIERO')).toBe(true);
    expect(ronda.trucoHandler.estadoResolucion).toBe('resuelto_no_querido');
    expect(ronda.puntosGanadosTruco).toBe(1);
  });

  test('Flow 2: Envido chain, Truco → Retruco, cards resolve the hand', () => {
    const { ronda, jugador1, jugador2 } = create1v1Ronda();

    expect(ronda.manejarCanto(jugador1.id, 'ENVIDO')).toBe(true);
    expect(ronda.manejarRespuestaCanto(jugador2.id, 'REAL_ENVIDO')).toBe(true);
    expect(ronda.envidoHandler.nivelActual).toBe('ENVIDO_REAL_ENVIDO');

    expect(ronda.manejarRespuestaCanto(jugador1.id, 'QUIERO')).toBe(true);
    expect(ronda.manejarDeclaracionPuntosEnvido(jugador1.id, 27)).toBe(true);
    expect(ronda.manejarDeclaracionPuntosEnvido(jugador2.id, 25)).toBe(true);
    expect(ronda.envidoHandler.estadoResolucion).toBe('resuelto');
    expect(ronda.puntosGanadosEnvido).toBe(5);

    expect(ronda.manejarCanto(jugador1.id, 'TRUCO')).toBe(true);
    expect(ronda.trucoPendientePorEnvidoPrimero).toBe(false);
    expect(ronda.manejarRespuestaCanto(jugador2.id, 'QUIERO')).toBe(true);

    expect(ronda.manejarCanto(jugador2.id, 'RETRUCO')).toBe(true);
    expect(ronda.trucoHandler.nivelActual).toBe('RETRUCO');
    expect(ronda.manejarRespuestaCanto(jugador1.id, 'QUIERO')).toBe(true);
    expect(ronda.trucoHandler.puntosEnJuego).toBe(3);

    asignarManosYResetearTurno(
      ronda,
      [
        createCarta('p1-c1', 1, 14),
        createCarta('p1-c2', 2, 13),
        createCarta('p1-c3', 3, 12)
      ],
      [
        createCarta('p2-c1', 4, 5),
        createCarta('p2-c2', 5, 4),
        createCarta('p2-c3', 6, 3)
      ]
    );

    expect(ronda.manejarJugarCarta(jugador1.id, 'p1-c1')).toBeTruthy();
    expect(ronda.manejarJugarCarta(jugador2.id, 'p2-c1')).toBeTruthy();
    expect(ronda.manejarJugarCarta(jugador1.id, 'p1-c2')).toBeTruthy();
    expect(ronda.manejarJugarCarta(jugador2.id, 'p2-c2')).toBeTruthy();

    expect(ronda.ganadorRondaEquipoId).toBe(jugador1.equipoId);
    expect(ronda.puntosGanadosTruco).toBe(3);
    expect(ronda.puntosGanadosEnvido).toBe(5);
  });
});
