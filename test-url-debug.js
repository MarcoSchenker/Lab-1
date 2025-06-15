const io = require('socket.io-client');

// Test URL parameter extraction
function testUrlExtraction() {
    const testUrls = [
        '/online-game-page/abc123',
        '/online-game-page/99b2e1a5',
        '/online-game-page/47875ffc'
    ];
    
    console.log('🔍 Testing URL parameter extraction...\n');
    
    testUrls.forEach(url => {
        const match = url.match(/\/online-game-page\/(.+)/);
        const extractedParam = match ? match[1] : null;
        
        console.log(`URL: ${url}`);
        console.log(`Extracted param: ${extractedParam}`);
        console.log(`Match successful: ${!!extractedParam}\n`);
    });
}

// Test real socket connection to game room
async function testGameRoomConnection() {
    console.log('🎮 Testing game room connection...\n');
    
    // Create room first
    const token1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzUwMDAyOTcwLCJleHAiOjE3NTA2MDc3NzB9.ymALG6P7Aw4KOuDsF3Bp1rLQZCGESVJVYfxrb20T484';
    
    try {
        const response = await fetch('http://localhost:3001/api/salas/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({
                tipo: 'publica',
                puntos_victoria: 15,
                max_jugadores: 2
            })
        });
        
        const data = await response.json();
        const codigoSala = data.codigo_sala;
        console.log(`✅ Sala creada: ${codigoSala}`);
        
        // Test socket connection with extracted parameter
        const socket = io('http://localhost:3001');
        
        socket.on('connect', () => {
            console.log(`🔌 Socket conectado: ${socket.id}`);
            socket.emit('autenticar_socket', token1);
        });
        
        socket.on('autenticacion_exitosa', () => {
            console.log('✅ Autenticado');
            console.log(`📡 Intentando unirse a sala: ${codigoSala}`);
            
            // Simulate what the frontend should do
            socket.emit('unirse_sala_juego', codigoSala);
        });
        
        socket.on('unido_sala_juego', (data) => {
            console.log('✅ Unido a sala de juego:', data);
        });
        
        socket.on('esperando_inicio_partida', (data) => {
            console.log('⏳ Esperando inicio:', data);
        });
        
        socket.on('estado_juego_actualizado', (estado) => {
            console.log('🎯 Estado recibido:', {
                codigoSala: estado.codigoSala,
                estadoPartida: estado.estadoPartida,
                jugadores: estado.jugadores?.length,
                equipos: estado.equipos?.length
            });
        });
        
        // Clean up after 10 seconds
        setTimeout(() => {
            socket.disconnect();
            console.log('🧹 Test completado');
            process.exit(0);
        }, 10000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function main() {
    testUrlExtraction();
    await testGameRoomConnection();
}

main();
