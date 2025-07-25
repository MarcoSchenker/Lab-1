/**
 * Test para validar las correcciones de envido y turno
 */

const RondaEnvidoHandler = require('../game-logic/RondaEnvidoHandler');
const RondaTurnoHandler = require('../game-logic/RondaTurnoHandler');

// Mock básico
class MockRonda {
    constructor() {
        this.jugadoresEnOrden = [
            { id: 1, equipoId: 'A' },
            { id: 2, equipoId: 'B' }
        ];
        this.equipos = [
            { id: 'A', jugadores: [{ id: 1 }] },
            { id: 'B', jugadores: [{ id: 2 }] }
        ];
        this.partida = { puntosVictoria: 15, equipos: [{ puntosPartida: 5 }, { puntosPartida: 8 }] };
        this.jugadorManoRonda = { id: 1 };
        this.acciones = [];
        this.notificaciones = [];
    }

    notificarEstado(tipo, datos) {
        this.notificaciones.push({ tipo, datos });
    }

    persistirAccion(accion) {
        this.acciones.push(accion);
    }

    _actualizarEstadoParaNotificar(tipo, datos) {
        this.notificaciones.push({ tipo, datos });
    }
}

function testCalculoPuntosEnvido() {
    console.log('\n=== TEST CÁLCULO PUNTOS ENVIDO ===');
    
    const ronda = new MockRonda();
    ronda.turnoHandler = new RondaTurnoHandler(ronda);
    ronda.turnoHandler.jugadorTurnoActual = { id: 1 };
    
    const envidoHandler = new RondaEnvidoHandler(ronda);
    
    // Test casos básicos
    console.log('1. ENVIDO querido:', envidoHandler._calcularPuntosEnvido('ENVIDO', true)); // Debería ser 2
    console.log('2. ENVIDO no querido:', envidoHandler._calcularPuntosEnvido('ENVIDO', false)); // Debería ser 1
    console.log('3. REAL_ENVIDO querido:', envidoHandler._calcularPuntosEnvido('REAL_ENVIDO', true)); // Debería ser 3
    console.log('4. ENVIDO_ENVIDO querido:', envidoHandler._calcularPuntosEnvido('ENVIDO_ENVIDO', true)); // Debería ser 4
    console.log('5. ENVIDO_ENVIDO no querido:', envidoHandler._calcularPuntosEnvido('ENVIDO_ENVIDO', false)); // Debería ser 2
    console.log('6. ENVIDO_REAL_ENVIDO querido:', envidoHandler._calcularPuntosEnvido('ENVIDO_REAL_ENVIDO', true)); // Debería ser 5
    console.log('7. ENVIDO_ENVIDO_REAL_ENVIDO querido:', envidoHandler._calcularPuntosEnvido('ENVIDO_ENVIDO_REAL_ENVIDO', true)); // Debería ser 7
}

function testGuardarRestaurarTurno() {
    console.log('\n=== TEST GUARDAR/RESTAURAR TURNO ===');
    
    const ronda = new MockRonda();
    const turnoHandler = new RondaTurnoHandler(ronda);
    
    // Simular un jugador en turno
    turnoHandler.jugadorTurnoActual = { id: 1 };
    turnoHandler.indiceJugadorTurnoActual = 0;
    
    console.log('1. Turno inicial:', turnoHandler.jugadorTurnoActual.id);
    
    // Guardar turno
    const guardado = turnoHandler.guardarTurnoAntesCanto();
    console.log('2. Turno guardado:', guardado);
    
    // Cambiar turno
    turnoHandler.setTurnoA(2);
    console.log('3. Turno después del cambio:', turnoHandler.jugadorTurnoActual.id);
    
    // Restaurar turno
    const restaurado = turnoHandler.restaurarTurnoAntesCanto();
    console.log('4. Turno restaurado:', restaurado);
    console.log('5. Turno final:', turnoHandler.jugadorTurnoActual.id);
}

function testSecuenciaEnvidoCompleta() {
    console.log('\n=== TEST SECUENCIA ENVIDO COMPLETA ===');
    
    const ronda = new MockRonda();
    ronda.turnoHandler = new RondaTurnoHandler(ronda);
    ronda.turnoHandler.jugadorTurnoActual = { id: 1 };
    ronda.trucoHandler = { estaPendienteDeRespuesta: () => false };
    
    const envidoHandler = new RondaEnvidoHandler(ronda);
    
    // 1. Cantar ENVIDO
    console.log('1. Cantando ENVIDO...');
    const cantado = envidoHandler.registrarCanto(1, 'ENVIDO');
    console.log('   Resultado:', cantado);
    console.log('   Estado:', envidoHandler.nivelActual);
    
    // 2. Responder con REAL_ENVIDO
    console.log('2. Respondiendo con REAL_ENVIDO...');
    const respuesta = envidoHandler.registrarRespuesta(2, 'REAL_ENVIDO');
    console.log('   Resultado:', respuesta);
    console.log('   Estado:', envidoHandler.nivelActual);
    
    // 3. Responder QUIERO
    console.log('3. Respondiendo QUIERO...');
    const quiero = envidoHandler.registrarRespuesta(1, 'QUIERO');
    console.log('   Resultado:', quiero);
    console.log('   Puntos en juego:', envidoHandler.puntosEnJuegoCalculados);
}

// Ejecutar tests
console.log('=== TESTING CORRECCIONES ENVIDO Y TURNO ===');

try {
    testCalculoPuntosEnvido();
    testGuardarRestaurarTurno();
    testSecuenciaEnvidoCompleta();
    
    console.log('\n=== TESTS COMPLETADOS ===');
    console.log('✅ Revisar resultados para validar correcciones');
} catch (error) {
    console.error('❌ Error durante los tests:', error);
    console.error('Stack:', error.stack);
}
