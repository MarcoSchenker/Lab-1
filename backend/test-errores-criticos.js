// Test completo para verificar errores de flujo corregidos
const PartidaGame = require('./game-logic/PartidaGame');
const JugadorGame = require('./game-logic/JugadorGame');
const EquipoGame = require('./game-logic/EquipoGame');

console.log("=== TEST DE ERRORES CRÍTICOS CORREGIDOS ===\n");

// 1. Test del error crítico de ganadorEnvidoEquipoId
console.log("1. Test de acceso correcto a ganadorEnvidoEquipoId...");
try {
    const partida = new PartidaGame(1);
    
    // Crear equipos y jugadores
    const equipo1 = new EquipoGame(1, "Equipo 1");
    const equipo2 = new EquipoGame(2, "Equipo 2");
    const jugador1 = new JugadorGame(1, "Jugador1", equipo1.id);
    const jugador2 = new JugadorGame(2, "Jugador2", equipo2.id);
    
    partida.agregarEquipo(equipo1);
    partida.agregarEquipo(equipo2);
    partida.agregarJugador(jugador1);
    partida.agregarJugador(jugador2);
    
    partida.iniciarPartida();
    
    // Simular envido cantado y aceptado
    const rondaActual = partida.rondaActual;
    console.log("Cantando envido...");
    rondaActual.envidoHandler.registrarCanto(jugador1.id, "ENVIDO");
    rondaActual.envidoHandler.registrarRespuesta(jugador2.id, "QUIERO");
    rondaActual.envidoHandler.registrarPuntosDeclarados(jugador1.id, 25);
    rondaActual.envidoHandler.registrarPuntosDeclarados(jugador2.id, 30);
    
    // Simular finalización de ronda para probar el acceso corregido
    rondaActual.ganadorRondaEquipoId = equipo2.id;
    rondaActual.puntosGanadosTruco = 1;
    rondaActual.puntosGanadosEnvido = 2;
    
    // Esta línea previamente causaba el error crítico
    console.log("Finalizando ronda (sin error)...");
    partida.finalizarRonda();
    
    console.log("✅ Test 1 PASÓ: Acceso a ganadorEnvidoEquipoId corregido\n");
    
} catch (error) {
    console.log(`❌ Test 1 FALLÓ: ${error.message}`);
    console.log("Stack:", error.stack);
}

// 2. Test de finalización de ronda cuando un equipo gana 2 manos
console.log("2. Test de finalización automática tras ganar 2 manos...");
try {
    const partida = new PartidaGame(2);
    
    // Crear equipos y jugadores
    const equipo1 = new EquipoGame(1, "Equipo 1");
    const equipo2 = new EquipoGame(2, "Equipo 2");
    const jugador1 = new JugadorGame(1, "Jugador1", equipo1.id);
    const jugador2 = new JugadorGame(2, "Jugador2", equipo2.id);
    
    partida.agregarEquipo(equipo1);
    partida.agregarEquipo(equipo2);
    partida.agregarJugador(jugador1);
    partida.agregarJugador(jugador2);
    
    partida.iniciarPartida();
    
    const ronda = partida.rondaActual;
    
    // Simular que el equipo 1 gana la primera mano
    console.log("Simulando primera mano ganada por Equipo 1...");
    ronda.turnoHandler.registrarCartaJugada(jugador1.id, ronda.jugadoresEnOrden[0].cartasEnMano[0]);
    ronda.turnoHandler.registrarCartaJugada(jugador2.id, ronda.jugadoresEnOrden[1].cartasEnMano[0]);
    
    // Forzar que el equipo 1 ganó la primera mano
    if (ronda.turnoHandler.manosJugadas.length > 0) {
        ronda.turnoHandler.manosJugadas[0].ganadorManoEquipoId = equipo1.id;
        ronda.turnoHandler.manosJugadas[0].ganadorManoJugadorId = jugador1.id;
        ronda.turnoHandler.manosJugadas[0].fueParda = false;
    }
    
    console.log("Simulando segunda mano ganada por Equipo 1...");
    // Simular segunda mano
    ronda.turnoHandler.registrarCartaJugada(jugador1.id, ronda.jugadoresEnOrden[0].cartasEnMano[1]);
    ronda.turnoHandler.registrarCartaJugada(jugador2.id, ronda.jugadoresEnOrden[1].cartasEnMano[1]);
    
    // Forzar que el equipo 1 ganó la segunda mano también
    if (ronda.turnoHandler.manosJugadas.length > 1) {
        ronda.turnoHandler.manosJugadas[1].ganadorManoEquipoId = equipo1.id;
        ronda.turnoHandler.manosJugadas[1].ganadorManoJugadorId = jugador1.id;
        ronda.turnoHandler.manosJugadas[1].fueParda = false;
    }
    
    // Verificar que la ronda debe finalizar después de 2 manos ganadas por el mismo equipo
    const deberiaFinalizar = ronda.turnoHandler.verificarFinDeRonda();
    
    if (deberiaFinalizar && ronda.ganadorRondaEquipoId === equipo1.id) {
        console.log("✅ Test 2 PASÓ: Ronda finaliza correctamente tras ganar 2 manos");
    } else {
        console.log(`❌ Test 2 FALLÓ: deberiaFinalizar=${deberiaFinalizar}, ganadorRondaEquipoId=${ronda.ganadorRondaEquipoId}`);
    }
    
} catch (error) {
    console.log(`❌ Test 2 FALLÓ: ${error.message}`);
    console.log("Stack:", error.stack);
}

// 3. Test de cálculo correcto de puntos de Falta Envido
console.log("\n3. Test de cálculo de Falta Envido...");
try {
    const partida = new PartidaGame(3);
    
    // Crear equipos con puntos específicos para probar Falta Envido
    const equipo1 = new EquipoGame(1, "Equipo 1");
    const equipo2 = new EquipoGame(2, "Equipo 2");
    equipo1.puntosPartida = 5; // 5 puntos
    equipo2.puntosPartida = 10; // 10 puntos
    
    const jugador1 = new JugadorGame(1, "Jugador1", equipo1.id);
    const jugador2 = new JugadorGame(2, "Jugador2", equipo2.id);
    
    partida.puntosVictoria = 30; // Partida a 30 puntos
    partida.agregarEquipo(equipo1);
    partida.agregarEquipo(equipo2);
    partida.agregarJugador(jugador1);
    partida.agregarJugador(jugador2);
    
    partida.iniciarPartida();
    
    const ronda = partida.rondaActual;
    
    // Cantar Falta Envido
    console.log("Cantando Falta Envido...");
    ronda.envidoHandler.registrarCanto(jugador1.id, "FALTA_ENVIDO");
    ronda.envidoHandler.registrarRespuesta(jugador2.id, "QUIERO");
    
    // Los puntos de Falta Envido deberían ser: 30 - 10 = 20 (puntos que le faltan al equipo2 para llegar a 30)
    const puntosEsperados = partida.puntosVictoria - equipo2.puntosPartida; // 30 - 10 = 20
    
    // Resolver declarando puntos
    ronda.envidoHandler.registrarPuntosDeclarados(jugador1.id, 25);
    ronda.envidoHandler.registrarPuntosDeclarados(jugador2.id, 30);
    
    const puntosCalculados = ronda.envidoHandler.puntosEnJuegoCalculados;
    
    if (puntosCalculados === puntosEsperados) {
        console.log(`✅ Test 3 PASÓ: Falta Envido calculado correctamente (${puntosCalculados} puntos)`);
    } else {
        console.log(`❌ Test 3 FALLÓ: Esperado ${puntosEsperados}, obtenido ${puntosCalculados}`);
    }
    
} catch (error) {
    console.log(`❌ Test 3 FALLÓ: ${error.message}`);
    console.log("Stack:", error.stack);
}

console.log("\n=== RESUMEN DE TESTS ===");
console.log("Los tests verifican las correcciones principales:");
console.log("1. Acceso correcto a ganadorEnvidoEquipoId (error crítico corregido)");
console.log("2. Finalización automática cuando un equipo gana 2 manos");
console.log("3. Cálculo correcto de puntos en Falta Envido");
console.log("\nSi todos los tests pasaron, los errores críticos están corregidos.");
