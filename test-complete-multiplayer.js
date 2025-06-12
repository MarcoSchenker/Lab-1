#!/usr/bin/env node

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const http = require('http');
const url = require('url');

console.log('🎮 PRUEBA COMPLETA DE FLUJO MULTIPLAYER\n');
console.log('======================================\n');

// Configuración
const SERVER_URL = 'http://localhost:3001';
const JWT_SECRET = 'my_super_secret_secure_key';

// Usuarios de prueba
const USERS = [
    {
        nombre_usuario: `test_player1_${Date.now()}`,
        email: `test_player1_${Date.now()}@test.com`,
        contraseña: 'testpass123'
    },
    {
        nombre_usuario: `test_player2_${Date.now()}`,
        email: `test_player2_${Date.now()}@test.com`,
        contraseña: 'testpass123'
    }
];

let roomCode = null;
let tokens = [];
let sockets = [];
let userIds = [];

// ===== UTILITY FUNCTIONS =====

function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const apiUrl = `${SERVER_URL}${endpoint}`;
        const parsedUrl = url.parse(apiUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 80,
            path: parsedUrl.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error || jsonData.message || 'Unknown error'}`));
                    }
                } catch (error) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ rawData: responseData });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// ===== STEP FUNCTIONS =====

async function step1_RegisterUsers() {
    console.log('📝 PASO 1: Registrando usuarios de prueba...');
    
    for (let i = 0; i < USERS.length; i++) {
        const user = USERS[i];
        console.log(`   Registrando ${user.nombre_usuario}...`);
        
        try {
            const response = await makeRequest('/usuarios', 'POST', user);
            console.log(`   ✅ Usuario ${user.nombre_usuario} registrado exitosamente`);
        } catch (error) {
            if (error.message.includes('409') || error.message.includes('ya existe')) {
                console.log(`   ℹ️  Usuario ${user.nombre_usuario} ya existe, continuando...`);
            } else {
                console.log(`   ⚠️  Error al registrar ${user.nombre_usuario}: ${error.message}`);
            }
        }
    }
    console.log('');
}

async function step2_LoginUsers() {
    console.log('🔐 PASO 2: Autenticando usuarios...');
    
    for (let i = 0; i < USERS.length; i++) {
        const user = USERS[i];
        console.log(`   Autenticando ${user.nombre_usuario}...`);
        
        try {
            const response = await makeRequest('/login', 'POST', {
                nombre_usuario: user.nombre_usuario,
                contraseña: user.contraseña
            });
            
            tokens[i] = response.accessToken;
            
            // Decodificar token para obtener ID del usuario
            const decoded = jwt.verify(response.accessToken, JWT_SECRET);
            userIds[i] = decoded.id;
            
            console.log(`   ✅ ${user.nombre_usuario} autenticado (ID: ${userIds[i]})`);
        } catch (error) {
            throw new Error(`Error al autenticar ${user.nombre_usuario}: ${error.message}`);
        }
    }
    console.log('');
}

async function step3_CreateRoom() {
    console.log('🏠 PASO 3: Creando sala de juego...');
    
    try {
        const response = await makeRequest('/api/salas/crear', 'POST', {
            tipo: 'publica',
            max_jugadores: 4,
            puntos_victoria: 15,
            tiempo_turno: 30
        }, {
            'Authorization': `Bearer ${tokens[0]}`
        });
        
        roomCode = response.codigo_sala;
        console.log(`   ✅ Sala creada exitosamente: ${roomCode}`);
    } catch (error) {
        throw new Error(`Error al crear sala: ${error.message}`);
    }
    console.log('');
}

async function step4_ConnectSockets() {
    console.log('🔌 PASO 4: Conectando WebSockets...');
    
    for (let i = 0; i < USERS.length; i++) {
        const user = USERS[i];
        console.log(`   Conectando socket para ${user.nombre_usuario}...`);
        
        const socket = await connectSocket(tokens[i], userIds[i], user.nombre_usuario, i + 1);
        if (socket) {
            sockets[i] = socket;
            console.log(`   ✅ Socket conectado y autenticado para ${user.nombre_usuario}`);
        } else {
            throw new Error(`Error al conectar socket para ${user.nombre_usuario}`);
        }
    }
    console.log('');
}

async function step5_JoinGameRoom() {
    console.log('🚪 PASO 5: Uniéndose a la sala de juego...');
    
    for (let i = 0; i < sockets.length; i++) {
        const user = USERS[i];
        console.log(`   ${user.nombre_usuario} uniéndose a sala ${roomCode}...`);
        
        sockets[i].emit('unirse_sala_juego', roomCode);
    }
    
    // Esperar un poco para que se procesen las uniones
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
}

async function step6_RequestGameState() {
    console.log('📋 PASO 6: Solicitando estado del juego...');
    
    for (let i = 0; i < sockets.length; i++) {
        const user = USERS[i];
        console.log(`   ${user.nombre_usuario} solicitando estado...`);
        
        sockets[i].emit('solicitar_estado_juego_ws');
    }
    
    // Esperar respuestas
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');
}

function connectSocket(token, userId, username, playerNumber) {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000
        });
        
        socket.on('connect', () => {
            // Autenticar inmediatamente
            socket.emit('autenticar_socket', token);
        });
        
        socket.on('autenticacion_exitosa', (data) => {
            console.log(`     Socket autenticado: ${data.username || username}`);
            resolve(socket);
        });
        
        socket.on('autenticacion_fallida', (error) => {
            console.log(`     ❌ Error de autenticación: ${error.message}`);
            resolve(null);
        });
        
        socket.on('connect_error', (error) => {
            console.log(`     ❌ Error de conexión: ${error.message}`);
            resolve(null);
        });
        
        // Eventos del juego
        socket.on('unido_sala_juego', (data) => {
            console.log(`     ✅ ${username} se unió a la sala de juego`);
        });
        
        socket.on('estado_juego_actualizado', (estado) => {
            console.log(`     📊 ${username} recibió estado del juego:`);
            console.log(`        Estado: ${estado.estadoPartida || estado.estado}`);
            console.log(`        Jugadores: ${estado.jugadores?.length || 0}`);
            console.log(`        Sala: ${estado.codigoSala || 'N/A'}`);
        });
        
        socket.on('esperando_inicio_partida', (data) => {
            console.log(`     ⏳ ${username}: ${data.mensaje}`);
        });
        
        socket.on('partida_iniciada', (data) => {
            console.log(`     🎮 ${username}: Partida iniciada!`);
            // Solicitar estado inicial automáticamente
            setTimeout(() => {
                socket.emit('solicitar_estado_inicial');
            }, 500);
        });
        
        socket.on('error_juego', (error) => {
            console.log(`     ❌ ${username} - Error de juego: ${error.message || error.mensaje}`);
        });
        
        // Timeout de seguridad
        setTimeout(() => {
            if (!socket.connected) {
                console.log(`     ⏰ Timeout de conexión para ${username}`);
                resolve(null);
            }
        }, 5000);
    });
}

// ===== MAIN EXECUTION =====

async function runCompleteTest() {
    try {
        console.log('🚀 Iniciando prueba completa de flujo multiplayer...\n');
        
        await step1_RegisterUsers();
        await step2_LoginUsers();
        await step3_CreateRoom();
        await step4_ConnectSockets();
        await step5_JoinGameRoom();
        await step6_RequestGameState();
        
        console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE!');
        console.log('📊 RESUMEN:');
        console.log(`   - Usuarios registrados: ${USERS.length}`);
        console.log(`   - Tokens obtenidos: ${tokens.length}`);
        console.log(`   - Sockets conectados: ${sockets.length}`);
        console.log(`   - Sala creada: ${roomCode}`);
        
        console.log('\n⏳ Manteniendo conexiones por 10 segundos para observar eventos...');
        
        setTimeout(() => {
            console.log('\n🔌 Cerrando conexiones...');
            sockets.forEach(socket => socket.disconnect());
            process.exit(0);
        }, 10000);
        
    } catch (error) {
        console.log(`\n❌ PRUEBA FALLIDA: ${error.message}`);
        
        // Limpiar conexiones
        sockets.forEach(socket => {
            if (socket) socket.disconnect();
        });
        
        process.exit(1);
    }
}

// Iniciar prueba
runCompleteTest();
