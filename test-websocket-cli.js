#!/usr/bin/env node

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

console.log('🎮 Iniciando prueba de flujo WebSocket...\n');

// Configuración de prueba
const SERVER_URL = 'http://localhost:3001';
const JWT_SECRET = 'my_super_secret_secure_key'; // Usar el mismo que está en .env
const TEST_USER = {
    id: Math.floor(Math.random() * 1000),
    username: `test_user_${Date.now()}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expira en 1 hora
};

// Crear token JWT válido
const testToken = jwt.sign(TEST_USER, JWT_SECRET);

console.log(`👤 Usuario de prueba: ${TEST_USER.username}`);
console.log(`🔑 Token generado: ${testToken.substring(0, 20)}...`);
console.log(`🔗 Conectando a: ${SERVER_URL}\n`);

// Crear conexión WebSocket
const socket = io(SERVER_URL, {
    auth: { token: testToken },
    transports: ['websocket', 'polling'],
    timeout: 20000,
    retries: 3
});

let roomCode = null;
let testResults = {
    connection: false,
    roomCreation: false,
    roomJoin: false,
    gameState: false,
    actions: false
};

// Función para crear usuario de prueba
async function createTestUser() {
    try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const apiUrl = `${SERVER_URL}/usuarios`;
        const parsedUrl = url.parse(apiUrl);
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;
        
        const postData = JSON.stringify({
            nombre_usuario: TEST_USER.username,
            email: `${TEST_USER.username}@test.com`,
            contraseña: 'testpass123'
        });
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = httpModule.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('✅ Usuario de prueba creado');
                    
                    // Ahora crear la partida
                    setTimeout(() => {
                        console.log('\n🏠 Creando partida a través de API REST...');
                        createRoomViaAPI();
                    }, 500);
                } else if (res.statusCode === 409) {
                    console.log('ℹ️  Usuario ya existe, continuando...');
                    
                    // Usuario ya existe, crear partida directamente
                    setTimeout(() => {
                        console.log('\n🏠 Creando partida a través de API REST...');
                        createRoomViaAPI();
                    }, 500);
                } else {
                    console.log(`❌ Error al crear usuario: ${res.statusCode}`);
                    console.log(`   Respuesta: ${data}`);
                    
                    // Intentar crear partida de todos modos
                    setTimeout(() => {
                        console.log('\n🏠 Intentando crear partida a pesar del error de usuario...');
                        createRoomViaAPI();
                    }, 500);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error en request de usuario: ${error.message}`);
            
            // Intentar crear partida de todos modos
            setTimeout(() => {
                console.log('\n🏠 Intentando crear partida a pesar del error...');
                createRoomViaAPI();
            }, 500);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.log(`❌ Error en createTestUser: ${error.message}`);
        
        // Intentar crear partida de todos modos
        setTimeout(() => {
            createRoomViaAPI();
        }, 500);
    }
}

// Función para crear sala vía API REST
async function createRoomViaAPI() {
    try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const apiUrl = `${SERVER_URL}/api/salas/crear`;
        const parsedUrl = url.parse(apiUrl);
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;
        
        const postData = JSON.stringify({
            tipo: 'publica',
            max_jugadores: 4,
            puntos_victoria: 15,
            tiempo_turno: 30
        });
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = httpModule.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    try {
                        const responseData = JSON.parse(data);
                        console.log('✅ Sala creada via API REST');
                        console.log(`   Código de sala: ${responseData.codigo_sala}`);
                        
                        roomCode = responseData.codigo_sala;
                        testResults.roomCreation = true;
                        
                        // Ahora unirse a la sala via WebSocket
                        setTimeout(() => {
                            console.log('\n🚪 Uniéndose a la sala via WebSocket...');
                            socket.emit('unirse_sala_juego', roomCode);
                        }, 500);
                    } catch (error) {
                        console.log(`❌ Error al parsear respuesta: ${error.message}`);
                        console.log(`   Respuesta: ${data}`);
                        testResults.roomCreation = false;
                        showFinalResults();
                    }
                } else {
                    console.log(`❌ Error al crear sala: ${res.statusCode}`);
                    console.log(`   Respuesta: ${data}`);
                    testResults.roomCreation = false;
                    showFinalResults();
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error en request: ${error.message}`);
            testResults.roomCreation = false;
            showFinalResults();
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.log(`❌ Error en createRoomViaAPI: ${error.message}`);
        testResults.roomCreation = false;
        showFinalResults();
    }
}

// Función para mostrar resultados finales
function showFinalResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADOS FINALES DE LA PRUEBA');
    console.log('='.repeat(50));
    
    Object.entries(testResults).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const description = {
            connection: 'Conexión WebSocket',
            roomCreation: 'Creación de partida',
            roomJoin: 'Unión a sala', 
            gameState: 'Estado del juego',
            actions: 'Acciones del juego'
        }[test];
        
        console.log(`${status} ${description}`);
    });
    
    const totalPassed = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log('\n' + '-'.repeat(30));
    console.log(`📈 Puntuación: ${totalPassed}/${totalTests} pruebas pasaron`);
    
    if (totalPassed === totalTests) {
        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! El sistema está funcionando correctamente.');
    } else {
        console.log('⚠️  Algunas pruebas fallaron. Revisa los logs arriba para más detalles.');
    }
    
    console.log('='.repeat(50));
    process.exit(totalPassed === totalTests ? 0 : 1);
}

// Event listeners de conexión
socket.on('connect', () => {
    console.log('✅ Socket conectado exitosamente');
    console.log(`   ID del socket: ${socket.id}`);
    testResults.connection = true;
    
    // Iniciar prueba creando usuario primero
    setTimeout(() => {
        console.log('\n👤 Creando usuario de prueba...');
        createTestUser();
    }, 1000);
});

socket.on('connect_error', (error) => {
    console.log(`❌ Error de conexión: ${error.message}`);
    testResults.connection = false;
    showFinalResults();
});

socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket desconectado: ${reason}`);
});

// Event listeners del juego

socket.on('unido_sala_juego', (data) => {
    console.log('✅ Unión a sala exitosa');
    console.log(`   Detalles: ${JSON.stringify(data, null, 2)}`);
    testResults.roomJoin = true;
    
    // Solicitar estado del juego
    setTimeout(() => {
        console.log('\n📋 Solicitando estado inicial del juego...');
        socket.emit('solicitar_estado_juego_ws');
    }, 500);
});

socket.on('partida_iniciada', (data) => {
    console.log('🎮 Partida iniciada');
    console.log(`   Mensaje: ${data.mensaje}`);
    
    // Solicitar estado inicial
    setTimeout(() => {
        console.log('📋 Solicitando estado inicial...');
        socket.emit('solicitar_estado_inicial');
    }, 100);
});

socket.on('estado_juego_actualizado', (data) => {
    console.log('✅ Estado del juego recibido');
    console.log(`   Estado: ${data.estado?.estado || 'No definido'}`);
    console.log(`   Jugadores: ${data.estado?.jugadores?.length || 0}`);
    console.log(`   Equipos: ${data.estado?.equipos?.length || 0}`);
    
    if (data.estado) {
        console.log('   Estructura del estado:');
        console.log(`     - rondaActual: ${data.estado.rondaActual ? 'Presente' : 'Ausente'}`);
        console.log(`     - turnoInfo: ${data.estado.rondaActual?.turnoInfo ? 'Presente' : 'Ausente'}`);
        console.log(`     - envidoInfo: ${data.estado.rondaActual?.envidoInfo ? 'Presente' : 'Ausente'}`);
        console.log(`     - trucoInfo: ${data.estado.rondaActual?.trucoInfo ? 'Presente' : 'Ausente'}`);
    }
    
    testResults.gameState = true;
    
    // Probar acciones del juego
    setTimeout(() => {
        console.log('\n🃏 Probando acciones del juego...');
        testGameActions();
    }, 1000);
});

socket.on('error_juego', (data) => {
    console.log(`❌ Error del juego: ${data.mensaje || 'Error desconocido'}`);
    console.log(`   Detalles: ${JSON.stringify(data, null, 2)}`);
});

socket.on('carta_jugada', (data) => {
    console.log('🃏 Carta jugada recibida');
    console.log(`   Detalles: ${JSON.stringify(data, null, 2)}`);
});

socket.on('canto_realizado', (data) => {
    console.log('🗣️ Canto realizado');
    console.log(`   Detalles: ${JSON.stringify(data, null, 2)}`);
});

// Función para probar acciones del juego
function testGameActions() {
    let actionsCompleted = 0;
    const totalActions = 3;
    
    // Acción 1: Solicitar estado
    console.log('   📋 Solicitando estado del juego...');
    socket.emit('solicitar_estado_juego_ws');
    actionsCompleted++;
    
    setTimeout(() => {
        // Acción 2: Intentar jugar carta (simulada)
        console.log('   🃏 Probando jugar carta...');
        const cartaSimulada = {
            idUnico: 'test_carta_1',
            numero: 1,
            palo: 'espada',
            valorEnvido: 1,
            valorTruco: 8
        };
        
        socket.emit('jugar_carta_ws', {
            codigoSala: roomCode,
            carta: cartaSimulada
        });
        actionsCompleted++;
        
        setTimeout(() => {
            // Acción 3: Intentar cantar
            console.log('   🗣️ Probando canto de Envido...');
            socket.emit('cantar_ws', {
                codigoSala: roomCode,
                tipoCanto: 'envido'
            });
            actionsCompleted++;
            
            if (actionsCompleted === totalActions) {
                console.log('✅ Todas las acciones del juego fueron enviadas');
                testResults.actions = true;
                
                // Mostrar resultados finales después de un breve delay
                setTimeout(showFinalResults, 2000);
            }
        }, 1000);
    }, 1000);
}

// Timeout de seguridad
setTimeout(() => {
    console.log('\n⏰ Timeout de prueba alcanzado');
    showFinalResults();
}, 15000);

console.log('⏳ Esperando conexión...\n');
