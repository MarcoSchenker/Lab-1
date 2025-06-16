/**
 * Test básico para validar la lógica de retruco e irse al mazo
 * Este test verifica los casos más importantes del flujo de truco
 */

const RondaTrucoHandler = require('./game-logic/RondaTrucoHandler');

// Mock básico de RondaGame para testing
class MockRonda {
    constructor() {
        this.jugadoresEnOrden = [
            { id: 1, equipoId: 'A' },
            { id: 2, equipoId: 'B' },
            { id: 3, equipoId: 'A' },
            { id: 4, equipoId: 'B' }
        ];
        this.equipos = [
            { id: 'A' },
            { id: 'B' }
        ];
        this.turnoHandler = {
            jugadorTurnoActual: { id: 1 },
            jugadorTurnoAlMomentoDelCantoId: null,
            setTurnoA: (jugadorId) => {
                this.turnoHandler.jugadorTurnoActual = this.jugadoresEnOrden.find(j => j.id === jugadorId);
                console.log(`Turno cambiado a jugador ${jugadorId}`);
            },
            guardarTurnoAntesCanto: () => {
                if (this.turnoHandler.jugadorTurnoActual) {
                    this.turnoHandler.jugadorTurnoAlMomentoDelCantoId = this.turnoHandler.jugadorTurnoActual.id;
                    console.log(`Guardando turno antes de canto: ${this.turnoHandler.jugadorTurnoActual.id}`);
                    return true;
                }
                return false;
            },
            restaurarTurnoAnteCanto: () => {
                if (this.turnoHandler.jugadorTurnoAlMomentoDelCantoId) {
                    this.turnoHandler.setTurnoA(this.turnoHandler.jugadorTurnoAlMomentoDelCantoId);
                    console.log(`Restaurando turno a: ${this.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
                    return true;
                }
                return false;
            }
        };
        this.envidoHandler = {
            estaPendienteDeRespuesta: () => false
        };
        this.ganadorRondaEquipoId = null;
        this.puntosGanadosTruco = 0;
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

    _finalizarRondaLogica() {
        console.log('Ronda finalizada');
    }
}

// Tests
function testRetruco() {
    console.log('\n=== TEST RETRUCO ===');
    
    const ronda = new MockRonda();
    const trucoHandler = new RondaTrucoHandler(ronda);
    
    // 1. Jugador 1 (Equipo A) canta TRUCO
    console.log('1. Jugador 1 canta TRUCO');
    const resultado1 = trucoHandler.registrarCanto(1, 'TRUCO');
    console.log('Resultado:', resultado1);
    console.log('Estado:', trucoHandler.getEstado());
    
    // 2. Jugador 2 (Equipo B) responde con RETRUCO
    console.log('\n2. Jugador 2 responde con RETRUCO');
    const resultado2 = trucoHandler.registrarRespuesta(2, 'RETRUCO');
    console.log('Resultado:', resultado2);
    console.log('Estado:', trucoHandler.getEstado());
    
    // 3. Jugador 1 (Equipo A) responde QUIERO al RETRUCO
    console.log('\n3. Jugador 1 responde QUIERO al RETRUCO');
    const resultado3 = trucoHandler.registrarRespuesta(1, 'QUIERO');
    console.log('Resultado:', resultado3);
    console.log('Estado:', trucoHandler.getEstado());
    console.log('Puntos en juego:', trucoHandler.puntosEnJuego);
}

function testVeleCuatro() {
    console.log('\n=== TEST VALE CUATRO ===');
    
    const ronda = new MockRonda();
    const trucoHandler = new RondaTrucoHandler(ronda);
    
    // 1. TRUCO
    trucoHandler.registrarCanto(1, 'TRUCO');
    console.log('1. TRUCO cantado');
    
    // 2. RETRUCO
    trucoHandler.registrarRespuesta(2, 'RETRUCO');
    console.log('2. RETRUCO como respuesta');
    
    // 3. VALE_CUATRO
    const resultado = trucoHandler.registrarRespuesta(1, 'VALE_CUATRO');
    console.log('3. VALE_CUATRO como respuesta:', resultado);
    console.log('Estado:', trucoHandler.getEstado());
    
    // 4. QUIERO al VALE_CUATRO
    const resultadoQuiero = trucoHandler.registrarRespuesta(2, 'QUIERO');
    console.log('4. QUIERO al VALE_CUATRO:', resultadoQuiero);
    console.log('Puntos en juego:', trucoHandler.puntosEnJuego);
}

function testIrseAlMazo() {
    console.log('\n=== TEST IRSE AL MAZO ===');
    
    const ronda = new MockRonda();
    const trucoHandler = new RondaTrucoHandler(ronda);
    
    // Caso 1: Irse al mazo sin truco cantado
    console.log('1. Irse al mazo sin truco cantado');
    trucoHandler.registrarMazo(1);
    console.log('Ganador:', ronda.ganadorRondaEquipoId, 'Puntos:', ronda.puntosGanadosTruco);
    
    // Caso 2: Irse al mazo con TRUCO cantado y pendiente
    console.log('\n2. Irse al mazo con TRUCO cantado pendiente');
    const ronda2 = new MockRonda();
    const trucoHandler2 = new RondaTrucoHandler(ronda2);
    
    trucoHandler2.registrarCanto(1, 'TRUCO'); // Equipo A canta
    trucoHandler2.registrarMazo(2); // Equipo B se va al mazo
    console.log('Ganador:', ronda2.ganadorRondaEquipoId, 'Puntos:', ronda2.puntosGanadosTruco);
    
    // Caso 3: Irse al mazo con RETRUCO cantado y pendiente
    console.log('\n3. Irse al mazo con RETRUCO cantado pendiente');
    const ronda3 = new MockRonda();
    const trucoHandler3 = new RondaTrucoHandler(ronda3);
    
    trucoHandler3.registrarCanto(1, 'TRUCO'); // Equipo A canta TRUCO
    console.log('   TRUCO cantado por Equipo A');
    trucoHandler3.registrarRespuesta(2, 'RETRUCO'); // Equipo B responde con RETRUCO
    console.log('   Equipo B responde con RETRUCO');
    console.log('   Estado antes de irse al mazo:', trucoHandler3.getEstado());
    trucoHandler3.registrarMazo(1); // El jugador 1 (Equipo A) se va al mazo (equipo que debe responder al RETRUCO)
    console.log('   Jugador 1 (Equipo A) se va al mazo');
    console.log('Ganador:', ronda3.ganadorRondaEquipoId, 'Puntos:', ronda3.puntosGanadosTruco);
    console.log('   → El Equipo B (que cantó RETRUCO) debería ganar 2 puntos');
}

function testCasosEspeciales() {
    console.log('\n=== TEST CASOS ESPECIALES ===');
    
    // Caso 1: Secuencia completa TRUCO → RETRUCO → VALE_CUATRO → QUIERO
    console.log('1. Secuencia completa hasta VALE_CUATRO');
    const ronda1 = new MockRonda();
    const trucoHandler1 = new RondaTrucoHandler(ronda1);
    
    trucoHandler1.registrarCanto(1, 'TRUCO');
    console.log('   TRUCO cantado');
    trucoHandler1.registrarRespuesta(2, 'RETRUCO');
    console.log('   RETRUCO como respuesta');
    trucoHandler1.registrarRespuesta(1, 'VALE_CUATRO');
    console.log('   VALE_CUATRO como respuesta');
    trucoHandler1.registrarRespuesta(2, 'QUIERO');
    console.log('   QUIERO al VALE_CUATRO');
    console.log('   Puntos finales en juego:', trucoHandler1.puntosEnJuego);
    
    // Caso 2: Irse al mazo después de que el truco fue querido
    console.log('\n2. Irse al mazo después de TRUCO querido');
    const ronda2 = new MockRonda();
    const trucoHandler2 = new RondaTrucoHandler(ronda2);
    
    trucoHandler2.registrarCanto(1, 'TRUCO');
    trucoHandler2.registrarRespuesta(2, 'QUIERO');
    console.log('   TRUCO querido, puntos en juego:', trucoHandler2.puntosEnJuego);
    trucoHandler2.registrarMazo(1); // Ahora se va al mazo
    console.log('   Ganador:', ronda2.ganadorRondaEquipoId, 'Puntos:', ronda2.puntosGanadosTruco);
    
    // Caso 3: NO_QUIERO al TRUCO
    console.log('\n3. NO_QUIERO al TRUCO');
    const ronda3 = new MockRonda();
    const trucoHandler3 = new RondaTrucoHandler(ronda3);
    
    trucoHandler3.registrarCanto(1, 'TRUCO'); // Equipo A canta
    trucoHandler3.registrarRespuesta(2, 'NO_QUIERO'); // Equipo B no quiere
    console.log('   Ganador:', ronda3.ganadorRondaEquipoId, 'Puntos:', ronda3.puntosGanadosTruco);
    console.log('   → Equipo A (que cantó) debería ganar 1 punto');
}

function testErrores() {
    console.log('\n=== TEST CASOS DE ERROR ===');
    
    const ronda = new MockRonda();
    const trucoHandler = new RondaTrucoHandler(ronda);
    
    // 1. Intentar cantar RETRUCO sin TRUCO previo
    console.log('1. Intentar RETRUCO sin TRUCO previo');
    const resultado1 = trucoHandler.registrarCanto(1, 'RETRUCO');
    console.log('Resultado (debería ser false):', resultado1);
    
    // 2. Intentar subir el propio truco
    console.log('\n2. Intentar subir el propio truco');
    trucoHandler.registrarCanto(1, 'TRUCO');
    const resultado2 = trucoHandler.registrarCanto(1, 'RETRUCO'); // Mismo jugador
    console.log('Resultado (debería ser false):', resultado2);
    
    // 3. Respuesta de equipo incorrecto
    console.log('\n3. Respuesta de equipo incorrecto');
    const resultado3 = trucoHandler.registrarRespuesta(3, 'QUIERO'); // Jugador 3 es equipo A (mismo que cantó)
    console.log('Resultado (debería ser false):', resultado3);
}

// Ejecutar tests
console.log('=== TESTING LÓGICA DE RETRUCO E IRSE AL MAZO ===');

try {
    testRetruco();
    testVeleCuatro();
    testIrseAlMazo();
    testCasosEspeciales();
    testErrores();
    
    console.log('\n=== TESTS COMPLETADOS ===');
    console.log('✅ Todos los tests ejecutados. Revisar logs para validar comportamiento.');
} catch (error) {
    console.error('❌ Error durante los tests:', error);
}
