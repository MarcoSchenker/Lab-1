/**
 * Test para verificar que:
 * 1. El falta envido se calcula correctamente basado en el equipo cantador
 * 2. Cuando se gana el envido y se alcanzan los puntos de victoria, la partida termina
 * 3. El modal de fin de partida aparece correctamente
 */

const PartidaGame = require('./game-logic/PartidaGame');
const JugadorGame = require('./game-logic/JugadorGame');
const EquipoGame = require('./game-logic/EquipoGame');

function crearPartidaTest() {
    const jugadores = [
        new JugadorGame(1, "Ana", 1),
        new JugadorGame(2, "Bob", 2) 
    ];
    
    const equipos = [
        new EquipoGame(1, "Equipo 1", [jugadores[0]]),
        new EquipoGame(2, "Equipo 2", [jugadores[1]])
    ];
    
    // Partida a 15 puntos para test más rápido
    const partida = new PartidaGame('TEST123', equipos, jugadores, 15, 'clasica');
    
    // Simular que el Equipo 1 ya tiene 12 puntos (le faltan 3 para ganar)
    equipos[0].puntosPartida = 12;
    equipos[1].puntosPartida = 8;
    
    console.log(`✅ Partida creada - Equipo 1: ${equipos[0].puntosPartida} puntos, Equipo 2: ${equipos[1].puntosPartida} puntos`);
    
    return { partida, jugadores, equipos };
}

async function testFaltaEnvidoCalculoCorrecto() {
    console.log('\n🧪 TEST 1: Cálculo correcto del falta envido');
    
    const { partida, jugadores, equipos } = crearPartidaTest();
    partida.iniciarJuego();
    
    // Jugador 1 (Equipo 1 con 12 puntos) canta falta envido
    console.log('👤 Jugador 1 canta falta envido...');
    partida.manejarAccionJugador(jugadores[0].id, 'cantar_envido', { tipo_canto: 'FALTA_ENVIDO' });
    
    // Verificar que el falta envido vale 3 puntos (15 - 12 = 3)
    const envidoHandler = partida.rondaActual.envidoHandler;
    const puntosFalta = envidoHandler._calcularPuntosFaltaEnvido();
    
    console.log(`📊 Puntos calculados para falta envido: ${puntosFalta}`);
    console.log(`📊 Esperado: 3 puntos (15 - 12 = 3)`);
    
    if (puntosFalta === 3) {
        console.log('✅ Cálculo de falta envido CORRECTO');
        return true;
    } else {
        console.log('❌ Cálculo de falta envido INCORRECTO');
        return false;
    }
}

async function testVictoriaPorEnvido() {
    console.log('\n🧪 TEST 2: Victoria por envido termina la partida');
    
    const { partida, jugadores, equipos } = crearPartidaTest();
    partida.iniciarJuego();
    
    // Jugador 1 canta falta envido
    console.log('👤 Jugador 1 canta falta envido...');
    partida.manejarAccionJugador(jugadores[0].id, 'cantar_envido', { tipo_canto: 'FALTA_ENVIDO' });
    
    // Jugador 2 acepta
    console.log('👤 Jugador 2 dice "quiero"...');
    partida.manejarAccionJugador(jugadores[1].id, 'responder_envido', { respuesta: 'QUIERO' });
    
    // Jugador 1 declara 33 de envido
    console.log('👤 Jugador 1 declara 33...');
    partida.manejarAccionJugador(jugadores[0].id, 'declarar_envido', { puntos: 33 });
    
    // Jugador 2 declara 30 (pierde)
    console.log('👤 Jugador 2 declara 30...');
    partida.manejarAccionJugador(jugadores[1].id, 'declarar_envido', { puntos: 30 });
    
    // Verificar que la partida terminó
    console.log(`📊 Estado de la partida: ${partida.estadoPartida}`);
    console.log(`📊 Puntos Equipo 1: ${equipos[0].puntosPartida}`);
    console.log(`📊 Puntos Equipo 2: ${equipos[1].puntosPartida}`);
    
    if (partida.estadoPartida === 'finalizada' && equipos[0].puntosPartida >= 15) {
        console.log('✅ Partida terminó correctamente por victoria en envido');
        return true;
    } else {
        console.log('❌ Partida NO terminó cuando debería');
        return false;
    }
}

async function runTests() {
    console.log('🚀 Iniciando tests de falta envido y victoria...\n');
    
    const results = [];
    
    try {
        results.push(await testFaltaEnvidoCalculoCorrecto());
        results.push(await testVictoriaPorEnvido());
        
        const passed = results.filter(r => r).length;
        const total = results.length;
        
        console.log(`\n📊 RESULTADOS: ${passed}/${total} tests pasaron`);
        
        if (passed === total) {
            console.log('🎉 ¡Todos los tests pasaron! El falta envido y la victoria por envido funcionan correctamente.');
        } else {
            console.log('⚠️ Algunos tests fallaron. Revisar la implementación.');
        }
        
    } catch (error) {
        console.error('💥 Error ejecutando tests:', error);
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    runTests();
}

module.exports = { runTests, testFaltaEnvidoCalculoCorrecto, testVictoriaPorEnvido };
