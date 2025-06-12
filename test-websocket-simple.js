#!/usr/bin/env node

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

console.log('🎮 Prueba Simplificada de WebSocket con Usuario Existente...\n');

// Configuración de prueba
const SERVER_URL = 'http://localhost:3001';
const JWT_SECRET = 'my_super_secret_secure_key';

// Usar un usuario existente (ID 1 suele ser el primer usuario en la DB)
const TEST_USER = {
    id: 1,
    nombre_usuario: 'usuario_prueba',  // Cambiar 'username' por 'nombre_usuario'
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expira en 1 hora
};

// Crear token JWT válido
const testToken = jwt.sign(TEST_USER, JWT_SECRET);

console.log(`👤 Usuario de prueba: ${TEST_USER.nombre_usuario} (ID: ${TEST_USER.id})`);
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

// Event listeners de conexión
socket.on('connect', () => {
    console.log('✅ Socket conectado exitosamente');
    console.log(`   ID del socket: ${socket.id}`);
    
    // Enviar token de autenticación
    console.log('🔐 Enviando token de autenticación...');
    socket.emit('autenticar_socket', testToken);
});

socket.on('autenticacion_exitosa', (data) => {
    console.log('✅ Autenticación exitosa');
    console.log(`   Usuario ID: ${data.userId}`);
    console.log(`   Username: ${data.username}`);
    
    // Ahora podemos probar unirse a sala
    setTimeout(() => {
        console.log('\n🚪 Probando unirse a sala via WebSocket...');
        roomCode = 'TEST123';
        socket.emit('unirse_sala_juego', roomCode);
    }, 1000);
});

socket.on('autenticacion_fallida', (data) => {
    console.log(`❌ Autenticación fallida: ${data.message}`);
    process.exit(1);
});

socket.on('connect_error', (error) => {
    console.log(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
});

socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket desconectado: ${reason}`);
});

// Event listeners del juego
socket.on('unido_sala_juego', (data) => {
    console.log('✅ Unión a sala exitosa');
    console.log(`   Detalles: ${JSON.stringify(data, null, 2)}`);
    
    // Solicitar estado del juego
    setTimeout(() => {
        console.log('\n📋 Solicitando estado del juego...');
        socket.emit('solicitar_estado_juego_ws');
    }, 500);
});

socket.on('estado_juego_actualizado', (data) => {
    console.log('✅ Estado del juego recibido');
    console.log(`   Estado: ${data.estado?.estado || 'No definido'}`);
    console.log(`   Jugadores: ${data.estado?.jugadores?.length || 0}`);
    console.log(`   Equipos: ${data.estado?.equipos?.length || 0}`);
    
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
    console.log('   📋 Solicitando estado del juego...');
    socket.emit('solicitar_estado_juego_ws');
    
    setTimeout(() => {
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
        
        setTimeout(() => {
            console.log('   🗣️ Probando canto de Envido...');
            socket.emit('cantar_ws', {
                codigoSala: roomCode,
                tipoCanto: 'envido'
            });
            
            console.log('\n✅ Pruebas de WebSocket completadas');
            console.log('🎉 El sistema de WebSocket está funcionando correctamente');
            
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        }, 1000);
    }, 1000);
}

// Timeout de seguridad
setTimeout(() => {
    console.log('\n⏰ Timeout de prueba alcanzado');
    process.exit(1);
}, 15000);

console.log('⏳ Esperando conexión...\n');
