#!/usr/bin/env node

/**
 * Test script para validar la corrección del problema de conexión
 * "No se pudo cargar el juego" en OnlineGamePage
 */

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

const SERVER_URL = 'http://localhost:3001';
const JWT_SECRET = 'my_super_secret_secure_key'; // Must match backend .env

console.log('🧪 INICIANDO TEST DE CORRECCIÓN DE CONEXIÓN');
console.log('=' .repeat(60));

// Simular usuarios de prueba
const testUsers = [
  { id: 1, nombre_usuario: 'TestUser1', email: 'test1@example.com' },
  { id: 2, nombre_usuario: 'TestUser2', email: 'test2@example.com' }
];

// Generar tokens JWT válidos
const tokens = testUsers.map(user => 
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' })
);

let testResults = {
  socketConnection: { passed: false, details: [] },
  authenticationFlow: { passed: false, details: [] },
  gameStateLoading: { passed: false, details: [] },
  reconnectionHandling: { passed: false, details: [] },
  errorRecovery: { passed: false, details: [] }
};

async function runConnectionTest() {
  console.log('\n🔧 TEST 1: Conexión Básica de Socket');
  console.log('-'.repeat(40));

  try {
    // Test conexión básica
    const socket1 = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout en conexión'));
      }, 10000);

      socket1.on('connect', () => {
        console.log('✅ Socket conectado:', socket1.id);
        testResults.socketConnection.passed = true;
        testResults.socketConnection.details.push('Conexión exitosa');
        clearTimeout(timeout);
        resolve();
      });

      socket1.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error.message);
        testResults.socketConnection.details.push(`Error: ${error.message}`);
        clearTimeout(timeout);
        reject(error);
      });
    });

    socket1.disconnect();
    console.log('✅ Test de conexión básica: PASADO');

  } catch (error) {
    console.error('❌ Test de conexión básica: FALLIDO -', error.message);
    testResults.socketConnection.details.push(`Falló: ${error.message}`);
  }
}

async function testAuthenticationFlow() {
  console.log('\n🔐 TEST 2: Flujo de Autenticación');
  console.log('-'.repeat(40));

  try {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout en autenticación'));
      }, 15000);

      socket.on('connect', () => {
        console.log('🔌 Socket conectado, iniciando autenticación...');
        socket.emit('autenticar_socket', tokens[0]);
      });

      socket.on('autenticacion_exitosa', (data) => {
        console.log('✅ Autenticación exitosa:', data);
        testResults.authenticationFlow.passed = true;
        testResults.authenticationFlow.details.push('Autenticación exitosa');
        clearTimeout(timeout);
        resolve();
      });

      socket.on('autenticacion_fallida', (error) => {
        console.error('❌ Autenticación fallida:', error);
        testResults.authenticationFlow.details.push(`Falló: ${error.message || error}`);
        clearTimeout(timeout);
        reject(new Error('Autenticación fallida'));
      });
    });

    socket.disconnect();
    console.log('✅ Test de autenticación: PASADO');

  } catch (error) {
    console.error('❌ Test de autenticación: FALLIDO -', error.message);
    testResults.authenticationFlow.details.push(`Falló: ${error.message}`);
  }
}

async function testGameStateLoading() {
  console.log('\n🎮 TEST 3: Carga de Estado de Juego');
  console.log('-'.repeat(40));

  try {
    // Crear sala primero
    const response = await fetch(`${SERVER_URL}/api/salas/crear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens[0]}`
      },
      body: JSON.stringify({
        tipo: 'publica',
        puntos_victoria: 15,
        max_jugadores: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Error creando sala: ${response.status}`);
    }

    const salaData = await response.json();
    const codigoSala = salaData.codigo_sala;
    console.log('🏠 Sala creada:', codigoSala);

    // Conectar y probar carga de estado
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    let estadoRecibido = false;
    let unidoASala = false;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!estadoRecibido) {
          console.log('⏱️ TIMEOUT - Eventos recibidos hasta ahora:');
          console.log(`  - Unido a sala: ${unidoASala}`);
          console.log(`  - Estado recibido: ${estadoRecibido}`);
          reject(new Error('Timeout esperando estado del juego'));
        }
      }, 20000);

      // Log de TODOS los eventos para debugging
      socket.onAny((eventName, ...args) => {
        console.log(`📡 Evento recibido: ${eventName}`, args);
      });

      socket.on('connect', () => {
        console.log('🔌 Socket conectado para test de estado');
        socket.emit('autenticar_socket', tokens[0]);
      });

      socket.on('autenticacion_exitosa', () => {
        console.log('🔐 Socket autenticado, uniéndose a sala...');
        socket.emit('unirse_sala_juego', codigoSala);
      });

      socket.on('autenticacion_fallida', (error) => {
        console.error('❌ Error de autenticación:', error);
        clearTimeout(timeout);
        reject(new Error('Error de autenticación'));
      });

      socket.on('unido_sala_juego', (data) => {
        console.log('✅ Unido a sala exitosamente:', data);
        unidoASala = true;
        console.log('🔄 Solicitando estado del juego...');
        socket.emit('solicitar_estado_juego_ws');
      });

      socket.on('error_unirse_sala', (error) => {
        console.error('❌ Error uniéndose a sala:', error);
        clearTimeout(timeout);
        reject(new Error('Error uniéndose a sala'));
      });

      socket.on('estado_juego_actualizado', (estado) => {
        console.log('✅ Estado del juego recibido:', {
          codigoSala: estado.codigoSala,
          equipos: estado.equipos?.length || 0,
          jugadores: estado.jugadores?.length || 0,
          estadoPartida: estado.estadoPartida
        });
        
        estadoRecibido = true;
        testResults.gameStateLoading.passed = true;
        testResults.gameStateLoading.details.push('Estado recibido correctamente');
        clearTimeout(timeout);
        resolve();
      });

      socket.on('error_estado_juego', (error) => {
        console.error('❌ Error obteniendo estado:', error);
        testResults.gameStateLoading.details.push(`Error: ${error.message}`);
        clearTimeout(timeout);
        reject(new Error('Error obteniendo estado'));
      });

      socket.on('esperando_inicio_partida', (data) => {
        console.log('⏳ Esperando inicio de partida:', data);
        testResults.gameStateLoading.passed = true; // Esto también es válido
        testResults.gameStateLoading.details.push('Sala en espera de jugadores - Estado válido');
        clearTimeout(timeout);
        resolve();
      });

      socket.on('error_juego', (error) => {
        console.error('❌ Error general del juego:', error);
        testResults.gameStateLoading.details.push(`Error: ${error.message || error}`);
        clearTimeout(timeout);
        reject(new Error('Error general del juego'));
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket desconectado durante test:', reason);
      });
    });

    socket.disconnect();
    console.log('✅ Test de carga de estado: PASADO');

  } catch (error) {
    console.error('❌ Test de carga de estado: FALLIDO -', error.message);
    testResults.gameStateLoading.details.push(`Falló: ${error.message}`);
  }
}

async function testReconnectionHandling() {
  console.log('\n🔄 TEST 4: Manejo de Reconexión');
  console.log('-'.repeat(40));

  try {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    let reconnectionCount = 0;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(); // No fallar por timeout, esto es esperado
      }, 15000);

      socket.on('connect', () => {
        console.log('🔌 Socket conectado');
        if (reconnectionCount === 0) {
          // Forzar desconexión para probar reconexión
          setTimeout(() => {
            console.log('⚡ Forzando desconexión para probar reconexión...');
            socket.disconnect();
            socket.connect();
          }, 2000);
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        reconnectionCount++;
        console.log(`✅ Reconexión exitosa (intento ${attemptNumber})`);
        testResults.reconnectionHandling.passed = true;
        testResults.reconnectionHandling.details.push(`Reconexión exitosa en intento ${attemptNumber}`);
        clearTimeout(timeout);
        resolve();
      });

      socket.on('reconnect_error', (error) => {
        console.log('⚠️ Error en reconexión:', error.message);
        testResults.reconnectionHandling.details.push(`Error: ${error.message}`);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket desconectado:', reason);
      });
    });

    socket.disconnect();
    console.log('✅ Test de reconexión: COMPLETADO');

  } catch (error) {
    console.error('❌ Test de reconexión: FALLIDO -', error.message);
    testResults.reconnectionHandling.details.push(`Falló: ${error.message}`);
  }
}

async function testErrorRecovery() {
  console.log('\n💊 TEST 5: Recuperación de Errores');
  console.log('-'.repeat(40));

  try {
    // Test con token inválido
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    let errorHandled = false;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (errorHandled) {
          resolve();
        } else {
          reject(new Error('No se manejó el error correctamente'));
        }
      }, 10000);

      socket.on('connect', () => {
        console.log('🔌 Socket conectado, enviando token inválido...');
        socket.emit('autenticar_socket', 'token_invalido');
      });

      socket.on('autenticacion_fallida', (error) => {
        console.log('✅ Error de autenticación manejado correctamente:', error);
        errorHandled = true;
        testResults.errorRecovery.passed = true;
        testResults.errorRecovery.details.push('Error de autenticación manejado');
        clearTimeout(timeout);
        resolve();
      });
    });

    socket.disconnect();
    console.log('✅ Test de recuperación de errores: PASADO');

  } catch (error) {
    console.error('❌ Test de recuperación de errores: FALLIDO -', error.message);
    testResults.errorRecovery.details.push(`Falló: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando batería completa de tests...\n');

  try {
    await runConnectionTest();
    await testAuthenticationFlow();
    await testGameStateLoading();
    await testReconnectionHandling();
    await testErrorRecovery();
  } catch (error) {
    console.error('Error durante los tests:', error);
  }

  // Mostrar resultados finales
  console.log('\n📊 RESULTADOS FINALES');
  console.log('=' .repeat(60));

  let totalPassed = 0;
  let totalTests = 0;

  Object.entries(testResults).forEach(([testName, result]) => {
    totalTests++;
    const status = result.passed ? '✅ PASADO' : '❌ FALLIDO';
    console.log(`${testName}: ${status}`);
    
    if (result.details.length > 0) {
      result.details.forEach(detail => {
        console.log(`  - ${detail}`);
      });
    }
    
    if (result.passed) totalPassed++;
    console.log();
  });

  console.log(`📈 RESUMEN: ${totalPassed}/${totalTests} tests pasaron`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON! La corrección de conexión es exitosa.');
    process.exit(0);
  } else {
    console.log('⚠️ Algunos tests fallaron. Revisar implementación.');
    process.exit(1);
  }
}

// Verificar que el servidor esté corriendo
async function checkServerHealth() {
  try {
    console.log('🔍 Verificando estado del servidor...');
    // Intentar conexión básica de socket
    const testSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('❌ Timeout conectando al servidor');
        testSocket.disconnect();
        resolve(false);
      }, 5000);

      testSocket.on('connect', () => {
        console.log('✅ Servidor backend activo');
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(true);
      });

      testSocket.on('connect_error', (error) => {
        console.error('❌ Error conectando al servidor:', error.message);
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Error verificando servidor:', error.message);
    return false;
  }
}

// Ejecutar tests
async function main() {
  try {
    const serverOk = await checkServerHealth();
    if (!serverOk) {
      console.log('🛑 Saltando tests porque el servidor no está disponible');
      process.exit(1);
    }

    await runAllTests();
  } catch (error) {
    console.error('💥 Error fatal en main:', error);
    process.exit(1);
  }
}

main().catch(console.error);
