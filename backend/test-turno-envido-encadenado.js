const PartidaGame = require('./game-logic/PartidaGame');
const JugadorGame = require('./game-logic/JugadorGame');
const EquipoGame = require('./game-logic/EquipoGame');

console.log('=== TEST TURNO DESPUÉS DE ENVIDO ENCADENADO ===\n');

// Crear la partida de prueba con parámetros correctos
const jugadoresInfo = [
    { id: '1', nombre_usuario: 'Ana' },
    { id: '2', nombre_usuario: 'Bob' }
];

const notificarEstado = (codigoSala, tipoEvento, datos) => {
    console.log(`[NOTIFY] ${tipoEvento} en sala ${codigoSala}`);
};

const persistirPartida = (id, estado) => {
    console.log(`[PERSIST] Persistiendo partida ${id}`);
};

const persistirAccion = (accion) => {
    console.log(`[PERSIST] Persistiendo acción ${accion.tipo_accion}`);
};

const finalizarPartida = (codigoSala, ganadorId) => {
    console.log(`[FINAL] Partida ${codigoSala} finalizada. Ganador: ${ganadorId}`);
};

const partida = new PartidaGame(
    'TEST_SALA',
    jugadoresInfo,
    '1v1',
    30,
    notificarEstado,
    persistirPartida,
    persistirAccion,
    finalizarPartida
);

console.log('1. ESTADO INICIAL:');
console.log(`   Jugador Mano: ${partida.rondaActual.jugadorManoRonda.nombreUsuario}`);
console.log(`   Turno inicial: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}\n`);

// Guardar el jugador que tiene el turno original
const jugadorTurnoOriginal = partida.rondaActual.turnoHandler.jugadorTurnoActual;

console.log('2. SECUENCIA DE ENVIDO ENCADENADO:');

// Paso 1: Ana canta ENVIDO
console.log('   Paso 1: Ana canta ENVIDO');
const resultadoCanto1 = partida.rondaActual.envidoHandler.registrarCanto('1', 'ENVIDO');
console.log(`   ✓ Resultado: ${resultadoCanto1}`);
console.log(`   ✓ Turno guardado: ${partida.rondaActual.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);

// Paso 2: Bob responde con ENVIDO (encadenamiento)
console.log('\n   Paso 2: Bob responde con ENVIDO (encadenamiento)');
const resultadoCanto2 = partida.rondaActual.envidoHandler.registrarRespuesta('2', 'ENVIDO');
console.log(`   ✓ Resultado: ${resultadoCanto2}`);
console.log(`   ✓ Turno guardado se mantiene: ${partida.rondaActual.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);

// Paso 3: Ana responde con REAL_ENVIDO (más encadenamiento)
console.log('\n   Paso 3: Ana responde con REAL_ENVIDO (más encadenamiento)');
const resultadoCanto3 = partida.rondaActual.envidoHandler.registrarRespuesta('1', 'REAL_ENVIDO');
console.log(`   ✓ Resultado: ${resultadoCanto3}`);
console.log(`   ✓ Turno guardado se mantiene: ${partida.rondaActual.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);

// Paso 4: Bob acepta con QUIERO
console.log('\n   Paso 4: Bob acepta con QUIERO');
const resultadoQuiero = partida.rondaActual.envidoHandler.registrarRespuesta('2', 'QUIERO');
console.log(`   ✓ Resultado: ${resultadoQuiero}`);
console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);

// Declarar puntos para resolver el envido
console.log('\n   Declaración de puntos:');
console.log('   Ana declara 25 puntos...');
const declaracion1 = partida.rondaActual.envidoHandler.registrarPuntosDeclarados('1', 25);
console.log(`   ✓ Resultado: ${declaracion1}`);

console.log('   Bob dice "Son buenas"...');
const sonBuenas = partida.rondaActual.envidoHandler.registrarSonBuenas('2');
console.log(`   ✓ Resultado: ${sonBuenas}`);

console.log('\n3. ESTADO FINAL:');
console.log(`   Jugador turno original: ${jugadorTurnoOriginal?.nombreUsuario}`);
console.log(`   Jugador turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);
console.log(`   Turno guardado limpiado: ${partida.rondaActual.turnoHandler.jugadorTurnoAlMomentoDelCantoId === null ? 'SÍ' : 'NO'}`);

// Verificar que el turno se restauró correctamente
const turnoRestauradoCorrectamente = jugadorTurnoOriginal?.id === partida.rondaActual.turnoHandler.jugadorTurnoActual?.id;

console.log('\n=== RESULTADO DEL TEST ===');
if (turnoRestauradoCorrectamente) {
    console.log('✅ ÉXITO: El turno se restauró correctamente al jugador original');
    console.log('✅ CORRECCIÓN EXITOSA: El problema de turno con envido encadenado se ha solucionado');
} else {
    console.log('❌ FALLO: El turno NO se restauró al jugador original');
    console.log(`   Esperado: ${jugadorTurnoOriginal?.nombreUsuario}`);
    console.log(`   Actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);
}

console.log('\n=== INFORMACIÓN ADICIONAL ===');
console.log(`Estado del envido: ${partida.rondaActual.envidoHandler.estadoResolucion}`);
console.log(`Nivel final: ${partida.rondaActual.envidoHandler.nivelActual}`);
console.log(`Puntos ganados: ${partida.rondaActual.puntosGanadosEnvido}`);
console.log(`Ganador envido: Equipo ${partida.rondaActual.envidoHandler.ganadorEnvidoEquipoId}`);
