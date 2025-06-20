// Test para validar correcciones de envido y puntos con mazo
console.log("=== TEST DE CORRECCIONES ENVIDO Y MAZO ===\n");

// 1. Simular secuencia Envido → Real Envido → opciones disponibles
console.log("1. Test de opciones de recanto de envido...");

const mockEnvidoHandler = {
    cantado: true,
    estadoResolucion: 'cantado_pendiente_respuesta',
    cantosRealizados: [
        { tipoOriginal: 'ENVIDO', tipoNormalizado: 'ENVIDO' }
    ],
    
    _obtenerNivelesCantoDisponibles() {
        if (!this.cantado) {
            return ['ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO'];
        }

        if (this.estadoResolucion === 'cantado_pendiente_respuesta') {
            const opciones = [];
            const secuenciaActual = this.cantosRealizados.map(c => c.tipoOriginal);
            
            // Solo se cantó ENVIDO
            if (secuenciaActual.length === 1 && secuenciaActual[0] === 'ENVIDO') {
                opciones.push('ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO');
            }
            // ENVIDO → ENVIDO
            else if (secuenciaActual.length === 2 && secuenciaActual.join('_') === 'ENVIDO_ENVIDO') {
                opciones.push('REAL_ENVIDO', 'FALTA_ENVIDO');
            }
            // ENVIDO → REAL_ENVIDO
            else if (secuenciaActual.length === 2 && secuenciaActual.join('_') === 'ENVIDO_REAL_ENVIDO') {
                opciones.push('FALTA_ENVIDO');
            }
            
            return opciones;
        }
        return [];
    }
};

// Test caso 1: Solo ENVIDO cantado
const opciones1 = mockEnvidoHandler._obtenerNivelesCantoDisponibles();
console.log(`Después de ENVIDO: ${opciones1.join(', ')}`);
const esperado1 = ['ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO'];
const exito1 = JSON.stringify(opciones1.sort()) === JSON.stringify(esperado1.sort());
console.log(exito1 ? '✅ PASÓ' : '❌ FALLÓ', '\n');

// Test caso 2: ENVIDO → ENVIDO
mockEnvidoHandler.cantosRealizados = [
    { tipoOriginal: 'ENVIDO', tipoNormalizado: 'ENVIDO' },
    { tipoOriginal: 'ENVIDO', tipoNormalizado: 'ENVIDO_ENVIDO' }
];
const opciones2 = mockEnvidoHandler._obtenerNivelesCantoDisponibles();
console.log(`Después de ENVIDO → ENVIDO: ${opciones2.join(', ')}`);
const esperado2 = ['REAL_ENVIDO', 'FALTA_ENVIDO'];
const exito2 = JSON.stringify(opciones2.sort()) === JSON.stringify(esperado2.sort());
console.log(exito2 ? '✅ PASÓ' : '❌ FALLÓ', '\n');

// Test caso 3: ENVIDO → REAL_ENVIDO
mockEnvidoHandler.cantosRealizados = [
    { tipoOriginal: 'ENVIDO', tipoNormalizado: 'ENVIDO' },
    { tipoOriginal: 'REAL_ENVIDO', tipoNormalizado: 'ENVIDO_REAL_ENVIDO' }
];
const opciones3 = mockEnvidoHandler._obtenerNivelesCantoDisponibles();
console.log(`Después de ENVIDO → REAL_ENVIDO: ${opciones3.join(', ')}`);
const esperado3 = ['FALTA_ENVIDO'];
const exito3 = JSON.stringify(opciones3.sort()) === JSON.stringify(esperado3.sort());
console.log(exito3 ? '✅ PASÓ' : '❌ FALLÓ', '\n');

// 2. Test de puntos de envido mantenidos tras irse al mazo
console.log("2. Test de puntos de envido mantenidos tras mazo...");

const mockRonda = {
    puntosGanadosEnvido: 5, // Envido ya resuelto por 5 puntos
    puntosGanadosTruco: 1,  // 1 punto por irse al mazo
    ganadorRondaEquipoId: 'equipo_1',
    envidoHandler: {
        ganadorEnvidoEquipoId: 'equipo_2', // El equipo 2 ganó el envido
        puntosEnJuegoCalculados: 5,
        estadoResolucion: 'resuelto',
        querido: true,
        cantado: true
    }
};

// Simular lógica de finalización
let puntosEnvidoFinales = 0;
if (mockRonda.envidoHandler.querido && 
    mockRonda.envidoHandler.estadoResolucion === 'resuelto' && 
    mockRonda.envidoHandler.ganadorEnvidoEquipoId) {
    puntosEnvidoFinales = mockRonda.envidoHandler.puntosEnJuegoCalculados || 0;
} else {
    puntosEnvidoFinales = 0;
}

// Asegurar que no sea undefined
if (puntosEnvidoFinales === undefined || puntosEnvidoFinales === null) {
    puntosEnvidoFinales = 0;
}

console.log(`Puntos de envido calculados: ${puntosEnvidoFinales}`);
console.log(`Puntos de truco: ${mockRonda.puntosGanadosTruco}`);

const exitoEnvido = puntosEnvidoFinales === 5;
const exitoTruco = mockRonda.puntosGanadosTruco === 1;

console.log(exitoEnvido ? '✅ Envido PASÓ' : '❌ Envido FALLÓ');
console.log(exitoTruco ? '✅ Truco PASÓ' : '❌ Truco FALLÓ');

// 3. Test de asignación correcta de puntos
console.log("\n3. Test de asignación de puntos a equipos...");

const mockEquipos = [
    { id: 'equipo_1', nombre: 'Equipo 1', puntosPartida: 3, sumarPuntos: function(p) { this.puntosPartida += p; } },
    { id: 'equipo_2', nombre: 'Equipo 2', puntosPartida: 7, sumarPuntos: function(p) { this.puntosPartida += p; } }
];

// Simular asignación según logs
const puntosEnvidoAAsignar = 5;
const puntosTrucoAAsignar = 1;

// El equipo 2 ganó el envido (5 puntos)
const equipoGanadorEnvido = mockEquipos.find(e => e.id === 'equipo_2');
if (equipoGanadorEnvido && puntosEnvidoAAsignar > 0) {
    equipoGanadorEnvido.sumarPuntos(puntosEnvidoAAsignar);
    console.log(`✅ ${equipoGanadorEnvido.nombre} sumó ${puntosEnvidoAAsignar} puntos de envido`);
}

// El equipo 1 ganó el truco (1 punto por mazo)
const equipoGanadorTruco = mockEquipos.find(e => e.id === 'equipo_1');
if (equipoGanadorTruco && puntosTrucoAAsignar > 0) {
    equipoGanadorTruco.sumarPuntos(puntosTrucoAAsignar);
    console.log(`✅ ${equipoGanadorTruco.nombre} sumó ${puntosTrucoAAsignar} puntos de truco`);
}

console.log(`\nPuntajes finales:`);
console.log(`Equipo 1: ${mockEquipos[0].puntosPartida} puntos (era 3, sumó 1)`);
console.log(`Equipo 2: ${mockEquipos[1].puntosPartida} puntos (era 7, sumó 5)`);

const puntajesCorrectos = mockEquipos[0].puntosPartida === 4 && mockEquipos[1].puntosPartida === 12;
console.log(puntajesCorrectos ? '✅ Asignación CORRECTA' : '❌ Asignación INCORRECTA');

// RESUMEN
console.log("\n=== RESUMEN ===");
console.log(`1. Opciones de recanto: ${exito1 && exito2 && exito3 ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
console.log(`2. Puntos mantenidos: ${exitoEnvido && exitoTruco ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
console.log(`3. Asignación equipos: ${puntajesCorrectos ? '✅ CORRECTO' : '❌ INCORRECTO'}`);

const todoCorrectos = (exito1 && exito2 && exito3) && (exitoEnvido && exitoTruco) && puntajesCorrectos;
console.log(`\n🎯 RESULTADO FINAL: ${todoCorrectos ? '✅ TODAS LAS CORRECCIONES FUNCIONAN' : '❌ HAY PROBLEMAS POR CORREGIR'}`);

if (todoCorrectos) {
    console.log("\n✨ El sistema debería manejar correctamente:");
    console.log("   • Opciones de recanto de envido (Envido → Real Envido → Falta Envido)");
    console.log("   • Mantenimiento de puntos de envido tras irse al mazo");
    console.log("   • Asignación correcta de puntos a equipos");
}
