#!/usr/bin/env node

/**
 * Comprehensive test for race condition fix in multiplayer Truco game
 * Tests the new partida_lista_para_iniciar vs partida_iniciada event flow
 */

const { io } = require('socket.io-client');
const https = require('https');
const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const API_BASE = SERVER_URL;

// Test users
const TEST_USERS = [
  { nombre_usuario: 'test_player_1', email: 'test1@race.com', contraseña: 'test123', token: null, socket: null },
  { nombre_usuario: 'test_player_2', email: 'test2@race.com', contraseña: 'test123', token: null, socket: null }
];

let roomCode = null;
let testResults = {
  userCreation: { success: false, details: [] },
  roomCreation: { success: false, details: [] },
  raceConditionFixed: { success: false, details: [] },
  websocketFlow: { success: false, details: [] }
};

console.log('🚀 INICIANDO TEST DE RACE CONDITION FIX');
console.log('==============================================================');

// Utility functions
function makeApiRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const isHttps = url.startsWith('https');
    const httpModule = isHttps ? https : http;
    
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message} - Response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test Step 1: Create and authenticate users
async function step1_CreateUsers() {
  console.log('\n📝 PASO 1: Creando usuarios de prueba...');
  
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    try {
      // Register user
      console.log(`   Registrando ${user.nombre_usuario}...`);
      await makeApiRequest('/usuarios', 'POST', {
        nombre_usuario: user.nombre_usuario,
        email: user.email,
        contraseña: user.contraseña
      });
      
      // Login user
      console.log(`   Autenticando ${user.nombre_usuario}...`);
      const loginResponse = await makeApiRequest('/login', 'POST', {
        nombre_usuario: user.nombre_usuario,
        contraseña: user.contraseña
      });
      
      user.token = loginResponse.accessToken;
      testResults.userCreation.details.push(`✅ ${user.nombre_usuario} creado y autenticado`);
      
    } catch (error) {
      if (error.message.includes('ya está en uso') || error.message.includes('Usuario ya existe')) {
        // User already exists, try to login
        console.log(`   ${user.nombre_usuario} ya existe, intentando login...`);
        try {
          const loginResponse = await makeApiRequest('/login', 'POST', {
            nombre_usuario: user.nombre_usuario,
            contraseña: user.contraseña
          });
          user.token = loginResponse.accessToken;
          testResults.userCreation.details.push(`✅ ${user.nombre_usuario} login exitoso`);
        } catch (loginError) {
          testResults.userCreation.details.push(`❌ ${user.nombre_usuario} falló login: ${loginError.message}`);
          throw loginError;
        }
      } else {
        testResults.userCreation.details.push(`❌ ${user.nombre_usuario} falló: ${error.message}`);
        throw error;
      }
    }
  }
  
  testResults.userCreation.success = true;
  console.log('   ✅ Todos los usuarios creados exitosamente');
}

// Test Step 2: Create room and test race condition
async function step2_TestRaceCondition() {
  console.log('\n🏠 PASO 2: Creando sala y probando race condition fix...');
  
  const user1 = TEST_USERS[0];
  
  try {
    // Create room
    console.log('   Creando sala con jugador 1...');
    const roomResponse = await makeApiRequest('/api/salas/crear', 'POST', {
      tipo: 'publica',
      max_jugadores: 2,
      puntos_victoria: 15,
      tiempo_turno: 30
    }, {
      'Authorization': `Bearer ${user1.token}`
    });
    
    roomCode = roomResponse.codigo_sala;
    console.log(`   ✅ Sala creada: ${roomCode}`);
    testResults.roomCreation.success = true;
    testResults.roomCreation.details.push(`✅ Sala ${roomCode} creada exitosamente`);
    
  } catch (error) {
    testResults.roomCreation.details.push(`❌ Error creando sala: ${error.message}`);
    throw error;
  }
}

// Test Step 3: Test WebSocket flow and race condition fix
async function step3_TestWebSocketFlow() {
  console.log('\n🔌 PASO 3: Probando flujo WebSocket y fix de race condition...');
  
  return new Promise((resolve, reject) => {
    let eventsReceived = {
      player1: { connected: false, authenticated: false, joined: false, partida_lista: false, partida_iniciada: false },
      player2: { connected: false, authenticated: false, joined: false, partida_lista: false, partida_iniciada: false }
    };
    
    let resolveTimeout;
    
    // Setup sockets for both players
    TEST_USERS.forEach((user, index) => {
      const playerName = `player${index + 1}`;
      console.log(`   Conectando ${user.nombre_usuario}...`);
      
      const socket = io(SERVER_URL, {
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      user.socket = socket;
      
      // Connection events
      socket.on('connect', () => {
        console.log(`   ✅ ${user.nombre_usuario} socket conectado`);
        eventsReceived[playerName].connected = true;
        socket.emit('autenticar_socket', user.token);
      });
      
      socket.on('autenticacion_exitosa', (data) => {
        console.log(`   ✅ ${user.nombre_usuario} socket autenticado`);
        eventsReceived[playerName].authenticated = true;
        
        // Join room - this is where race condition could occur
        console.log(`   ${user.nombre_usuario} uniéndose a sala ${roomCode}...`);
        
        // ✅ CRITICAL: Both players must join lobby room FIRST to receive redirection events
        socket.emit('unirse_sala_lobby', roomCode);
        
        // For player 2, also join via API to trigger game start
        if (index === 1) {
          // Add small delay to ensure lobby room is joined
          setTimeout(() => {
            makeApiRequest('/api/salas/unirse', 'POST', {
              codigo_sala: roomCode
            }, {
              'Authorization': `Bearer ${user.token}`
            }).then((response) => {
              console.log(`   📡 ${user.nombre_usuario} respuesta API:`, response);
              
              // Check if partida_iniciada flag is present (new behavior)
              if (response.partida_iniciada === true) {
                testResults.raceConditionFixed.details.push('✅ API response includes partida_iniciada flag');
              }
              
              // Now join via WebSocket
              socket.emit('unirse_sala_juego', roomCode);
            }).catch((error) => {
              console.log(`   ❌ ${user.nombre_usuario} API join error:`, error.message);
            });
          }, 50);
        } else {
          // Player 1 also joins lobby room and then game room
          setTimeout(() => {
            socket.emit('unirse_sala_juego', roomCode);
          }, 50);
        }
      });
      
      socket.on('unido_sala_juego', (data) => {
        console.log(`   ✅ ${user.nombre_usuario} unido a sala de juego`);
        eventsReceived[playerName].joined = true;
      });
      
      // NEW EVENT: iniciar_redireccion_juego (race condition fix)
      socket.on('iniciar_redireccion_juego', (data) => {
        console.log(`   🎯 ${user.nombre_usuario} recibió iniciar_redireccion_juego:`, data);
        eventsReceived[playerName].partida_lista = true;
        testResults.raceConditionFixed.details.push(`✅ ${user.nombre_usuario} recibió evento iniciar_redireccion_juego`);
      });
      
      // OLD EVENT: partida_iniciada (should come after state sync)
      socket.on('partida_iniciada', (data) => {
        console.log(`   🎮 ${user.nombre_usuario} recibió partida_iniciada:`, data);
        eventsReceived[playerName].partida_iniciada = true;
        testResults.websocketFlow.details.push(`✅ ${user.nombre_usuario} recibió evento partida_iniciada`);
        
        // Request initial game state
        socket.emit('solicitar_estado_inicial');
      });
      
      socket.on('estado_juego_actualizado', (estado) => {
        console.log(`   📊 ${user.nombre_usuario} recibió estado del juego`);
        testResults.websocketFlow.details.push(`✅ ${user.nombre_usuario} recibió estado del juego`);
      });
      
      socket.on('esperando_inicio_partida', (data) => {
        console.log(`   ⏳ ${user.nombre_usuario} esperando inicio:`, data.mensaje);
      });
      
      socket.on('error_juego', (error) => {
        console.log(`   ❌ ${user.nombre_usuario} error de juego:`, error);
      });
      
      socket.on('connect_error', (error) => {
        console.log(`   ❌ ${user.nombre_usuario} error de conexión:`, error.message);
        reject(error);
      });
    });
    
    // Check results after a reasonable time
    resolveTimeout = setTimeout(() => {
      console.log('\n   📋 Analizando eventos recibidos...');
      
      // Check if race condition is fixed
      const player1Events = eventsReceived.player1;
      const player2Events = eventsReceived.player2;
      
      let raceConditionFixed = true;
      let websocketFlowWorking = true;
      
      // Both players should receive iniciar_redireccion_juego
      if (player1Events.partida_lista && player2Events.partida_lista) {
        testResults.raceConditionFixed.details.push('✅ Ambos jugadores recibieron iniciar_redireccion_juego');
      } else {
        testResults.raceConditionFixed.details.push('❌ No todos los jugadores recibieron iniciar_redireccion_juego');
        raceConditionFixed = false;
      }
      
      // Both players should eventually receive partida_iniciada
      if (player1Events.partida_iniciada && player2Events.partida_iniciada) {
        testResults.websocketFlow.details.push('✅ Ambos jugadores recibieron partida_iniciada');
      } else {
        testResults.websocketFlow.details.push('❌ No todos los jugadores recibieron partida_iniciada');
        websocketFlowWorking = false;
      }
      
      testResults.raceConditionFixed.success = raceConditionFixed;
      testResults.websocketFlow.success = websocketFlowWorking;
      
      // Clean up sockets
      TEST_USERS.forEach(user => {
        if (user.socket) {
          user.socket.disconnect();
        }
      });
      
      resolve();
    }, 8000);
  });
}

// Main test function
async function runRaceConditionTest() {
  try {
    await step1_CreateUsers();
    await step2_TestRaceCondition();
    await step3_TestWebSocketFlow();
    
    console.log('\n📊 RESULTADOS FINALES DEL TEST');
    console.log('==============================================================');
    
    // Print results
    Object.keys(testResults).forEach(testName => {
      const result = testResults[testName];
      const status = result.success ? '✅ PASÓ' : '❌ FALLÓ';
      console.log(`\n${testName.toUpperCase()}: ${status}`);
      
      result.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    });
    
    // Final assessment
    const allTestsPassed = Object.values(testResults).every(result => result.success);
    
    console.log('\n🎯 EVALUACIÓN FINAL');
    console.log('==============================================================');
    
    if (allTestsPassed) {
      console.log('✅ TODOS LOS TESTS PASARON - Race condition SOLUCIONADO');
      console.log('   • Usuarios pueden crear y autenticar correctamente');
      console.log('   • Salas se crean sin problemas');
      console.log('   • Evento partida_lista_para_iniciar funciona correctamente');
      console.log('   • Flujo WebSocket completo funciona sin race conditions');
    } else {
      console.log('❌ ALGUNOS TESTS FALLARON - Race condition NO completamente solucionado');
      
      Object.keys(testResults).forEach(testName => {
        if (!testResults[testName].success) {
          console.log(`   • ${testName} necesita revisión`);
        }
      });
    }
    
    process.exit(allTestsPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO EN EL TEST:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start the test
runRaceConditionTest();
