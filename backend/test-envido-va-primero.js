const PartidaGame = require('./game-logic/PartidaGame');

async function testEnvidoVaPrimero() {
    console.log('=== TEST ENVIDO VA PRIMERO ===\n');
    
    const jugadores = [
        { id: '1', nombre_usuario: 'Ana' },
        { id: '2', nombre_usuario: 'Bob' }
    ];
    
    // Crear callbacks mock
    const notificarCallback = (sala, evento, data) => {
        console.log(`[NOTIFY] ${evento} en sala ${sala}`);
    };
    const persistirPartidaCallback = (id, estado) => {
        console.log(`[PERSIST] Persistiendo partida ${id}`);
    };
    const persistirAccionCallback = (accion) => {
        console.log(`[PERSIST] Persistiendo acción ${accion.tipo_accion}`);
    };
    const finalizarCallback = (sala, ganador) => {
        console.log(`[FINALIZE] Partida ${sala} finalizada, ganador: ${ganador}`);
    };
    
    const partida = new PartidaGame(
        'TEST_SALA', 
        jugadores, 
        '1v1', 
        30, 
        notificarCallback, 
        persistirPartidaCallback, 
        persistirAccionCallback, 
        finalizarCallback
    );
    
    // Esperar un poco para que se configure la partida
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('1. ESTADO INICIAL:');
    console.log('   Jugador Mano: Ana');
    console.log('   Turno inicial: Ana\n');
    
    console.log('2. SECUENCIA ENVIDO VA PRIMERO:');
    console.log('   Paso 1: Ana canta TRUCO');
    const result1 = await partida.manejarAccionJugador('1', 'CANTO', { tipoCanto: 'TRUCO' });
    console.log(`   ✓ Resultado: ${result1}`);
    console.log(`   ✓ TrucoPendientePorEnvidoPrimero: ${partida.rondaActual.trucoPendientePorEnvidoPrimero}`);
    console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}\n`);
    
    console.log('   Paso 2: Bob (equipo respondedor) canta ENVIDO');
    const result2 = await partida.manejarAccionJugador('2', 'CANTO', { tipoCanto: 'ENVIDO' });
    console.log(`   ✓ Resultado: ${result2}`);
    console.log(`   ✓ TrucoPendientePorEnvidoPrimero: ${partida.rondaActual.trucoPendientePorEnvidoPrimero}`);
    console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}\n`);
    
    console.log('   Paso 3: Ana responde QUIERO al envido');
    const result3 = await partida.manejarAccionJugador('1', 'RESPUESTA_CANTO', { respuesta: 'QUIERO' });
    console.log(`   ✓ Resultado: ${result3}`);
    console.log(`   ✓ Estado envido: ${partida.rondaActual.envidoHandler.estadoResolucion}`);
    console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}\n`);
    
    console.log('   Declaración de puntos:');
    console.log('   Ana declara 20 puntos...');
    const result4 = await partida.manejarAccionJugador('1', 'DECLARAR_PUNTOS_ENVIDO', { puntos: 20 });
    console.log(`   ✓ Resultado: ${result4}`);
    
    console.log('   Bob declara 25 puntos...');
    const result5 = await partida.manejarAccionJugador('2', 'DECLARAR_PUNTOS_ENVIDO', { puntos: 25 });
    console.log(`   ✓ Resultado: ${result5}`);
    console.log(`   ✓ Estado envido: ${partida.rondaActual.envidoHandler.estadoResolucion}`);
    console.log(`   ✓ Ganador envido: ${partida.rondaActual.envidoHandler.ganadorEnvidoEquipoId}`);
    console.log(`   ✓ TrucoPendientePorEnvidoPrimero: ${partida.rondaActual.trucoPendientePorEnvidoPrimero}`);
    console.log(`   ✓ Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}\n`);
    
    console.log('3. ESTADO FINAL:');
    console.log(`   Envido resuelto: ${partida.rondaActual.envidoHandler.estadoResolucion === 'resuelto'}`);
    console.log(`   Truco pendiente: ${partida.rondaActual.trucoHandler.estaPendienteDeRespuesta()}`);
    console.log(`   Turno actual: ${partida.rondaActual.turnoHandler.jugadorTurnoActual?.nombreUsuario}`);
    console.log(`   Debe responder truco: ${partida.rondaActual.trucoHandler.equipoDebeResponderTruco?.jugadores[0]?.nombreUsuario}\n`);
    
    // Verificar el estado esperado
    const estadoEsperado = {
        envidoResuelto: partida.rondaActual.envidoHandler.estadoResolucion === 'resuelto',
        trucoPendiente: partida.rondaActual.trucoHandler.estaPendienteDeRespuesta(),
        turnoEnBob: partida.rondaActual.turnoHandler.jugadorTurnoActual?.id === '2',
        equipoRespondeTruco: partida.rondaActual.trucoHandler.equipoDebeResponderTruco?.id === 'equipo_2'
    };
    
    console.log('=== RESULTADO DEL TEST ===');
    if (estadoEsperado.envidoResuelto && 
        estadoEsperado.trucoPendiente && 
        estadoEsperado.turnoEnBob && 
        estadoEsperado.equipoRespondeTruco) {
        console.log('✅ ÉXITO: ENVIDO VA PRIMERO funcionó correctamente');
        console.log('✅ El envido se resolvió y el turno volvió al jugador que debe responder el truco');
    } else {
        console.log('❌ FALLO: Hay problemas con la secuencia de ENVIDO VA PRIMERO');
        console.log('Estado obtenido:', estadoEsperado);
    }
}

// Sobrescribir métodos de notificación para silenciar las notificaciones
const originalNotificar = PartidaGame.prototype.notificarEstadoGlobal;
PartidaGame.prototype.notificarEstadoGlobal = function() {
    // Silenciar notificaciones
};

const originalPersistir = PartidaGame.prototype.persistirAccion;
PartidaGame.prototype.persistirAccion = function() {
    // Silenciar persistencia 
    return Promise.resolve();
};

testEnvidoVaPrimero().catch(console.error);
