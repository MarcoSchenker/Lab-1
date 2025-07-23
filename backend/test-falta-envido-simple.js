/**
 * Test simple para verificar el cálculo del falta envido
 */

const RondaEnvidoHandler = require('./game-logic/RondaEnvidoHandler');

function testFaltaEnvidoCalculoSimple() {
    console.log('🧪 TEST: Cálculo de Falta Envido');
    
    // Mock de la ronda y partida
    const mockPartida = {
        puntosVictoria: 15,
        equipos: [
            { id: 1, nombre: 'Equipo 1', puntosPartida: 12 }, // Equipo con MÁS puntos
            { id: 2, nombre: 'Equipo 2', puntosPartida: 8 }   // Equipo con menos puntos
        ]
    };
    
    const mockRonda = {
        partida: mockPartida
    };
    
    const envidoHandler = new RondaEnvidoHandler(mockRonda);
    
    // ✅ CORRECCIÓN: El falta envido se calcula basado en el equipo CON MÁS PUNTOS, no el cantador
    // Aunque el Equipo 2 (8 puntos) cante falta envido, se calcula basado en el Equipo 1 (12 puntos)
    envidoHandler.cantos = [
        {
            equipoId: 2, // Equipo 2 canta falta envido
            tipoCantoOriginal: 'FALTA_ENVIDO'
        }
    ];
    
    const puntosFalta = envidoHandler._calcularPuntosFaltaEnvido();
    
    console.log(`📊 Equipo cantador: Equipo 2 (8 puntos)`);
    console.log(`📊 Equipo con MÁS puntos: Equipo 1 (12 puntos)`);
    console.log(`📊 Puntos para victoria: 15`);
    console.log(`📊 Falta envido calculado: ${puntosFalta} puntos`);
    console.log(`📊 Esperado: 3 puntos (15 - 12 = 3) - basado en equipo con MÁS puntos`);
    
    if (puntosFalta === 3) {
        console.log('✅ CORRECTO: El falta envido se calcula basado en el equipo con MÁS puntos');
        return true;
    } else {
        console.log('❌ ERROR: El cálculo del falta envido es incorrecto');
        return false;
    }
}

function testFaltaEnvidoMinimo() {
    console.log('\n🧪 TEST: Falta Envido mínimo (1 punto)');
    
    const mockPartida = {
        puntosVictoria: 15,
        equipos: [
            { id: 1, nombre: 'Equipo 1', puntosPartida: 15 }, // Ya tiene 15 puntos
            { id: 2, nombre: 'Equipo 2', puntosPartida: 10 }
        ]
    };
    
    const mockRonda = {
        partida: mockPartida
    };
    
    const envidoHandler = new RondaEnvidoHandler(mockRonda);
    
    // Simular que el Equipo 1 (15 puntos) cantó falta envido
    envidoHandler.cantos = [
        {
            equipoId: 1,
            tipoCantoOriginal: 'FALTA_ENVIDO'
        }
    ];
    
    const puntosFalta = envidoHandler._calcularPuntosFaltaEnvido();
    
    console.log(`📊 Equipo cantador: Equipo 1 (15 puntos - ya ganó)`);
    console.log(`📊 Falta envido calculado: ${puntosFalta} puntos`);
    console.log(`📊 Esperado: 1 punto (mínimo)`);
    
    if (puntosFalta === 1) {
        console.log('✅ CORRECTO: El falta envido mínimo es 1 punto');
        return true;
    } else {
        console.log('❌ ERROR: El falta envido debería valer mínimo 1 punto');
        return false;
    }
}

function runTests() {
    console.log('🚀 Iniciando tests del cálculo de Falta Envido...\n');
    
    const results = [
        testFaltaEnvidoCalculoSimple(),
        testFaltaEnvidoMinimo()
    ];
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n📊 RESULTADOS: ${passed}/${total} tests pasaron`);
    
    if (passed === total) {
        console.log('🎉 ¡Todos los tests pasaron! El cálculo del falta envido es correcto.');
    } else {
        console.log('⚠️ Algunos tests fallaron. El cálculo del falta envido necesita corrección.');
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
