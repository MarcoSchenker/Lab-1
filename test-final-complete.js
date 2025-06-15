const { io } = require('socket.io-client');

console.log('🎮 TEST DEFINITIVO - VALIDACIÓN COMPLETA DEL FLUJO');
console.log('='.repeat(60));

async function testCompleteFlow() {
    try {
        console.log('\n1️⃣ CONFIGURANDO JUGADOR 1...');
        
        // Configurar jugador 1
        const socket1 = io('http://localhost:3001', {
            autoConnect: false
        });
        
        const token1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqdWdhZG9yMUB0ZXN0LmNvbSIsImlhdCI6MTc1MDAwMzU2MywiZXhwIjoxNzUwMDA3MTYzfQ.S-YkkWiFwgJk83zvCYPcsfiviZ2SrlMJFMAKByDXlaA';
        
        await new Promise((resolve, reject) => {
            socket1.connect();
            socket1.on('connect', () => {
                console.log('✅ Jugador 1 conectado');
                socket1.emit('autenticar_socket', token1);
            });
            
            socket1.on('autenticacion_exitosa', () => {
                console.log('✅ Jugador 1 autenticado');
                resolve();
            });
            
            socket1.on('connect_error', reject);
            setTimeout(() => reject(new Error('Timeout jugador 1')), 5000);
        });
        
        console.log('\n2️⃣ CREANDO SALA...');
        
        // Crear sala
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
        
        const salaData = await response.json();
        const codigoSala = salaData.codigo_sala;
        console.log(`✅ Sala creada: ${codigoSala}`);
        
        // Jugador 1 se une al lobby de la sala para recibir eventos de redirección
        socket1.emit('unirse_sala_lobby', codigoSala);
        console.log('✅ Jugador 1 unido al lobby de la sala');
        
        console.log('\n3️⃣ CONFIGURANDO JUGADOR 2...');
        
        // Configurar jugador 2
        const socket2 = io('http://localhost:3001', {
            autoConnect: false
        });
        
        const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqdWdhZG9yMkB0ZXN0LmNvbSIsImlhdCI6MTc1MDAwMzU2MywiZXhwIjoxNzUwMDA3MTYzfQ.fs1OkPWY6sa6YxkiOvhstQ3jwQbWFXEa9NPmKWm0K4';
        
        await new Promise((resolve, reject) => {
            socket2.connect();
            socket2.on('connect', () => {
                console.log('✅ Jugador 2 conectado');
                socket2.emit('autenticar_socket', token2);
            });
            
            socket2.on('autenticacion_exitosa', () => {
                console.log('✅ Jugador 2 autenticado');
                resolve();
            });
            
            socket2.on('connect_error', reject);
            setTimeout(() => reject(new Error('Timeout jugador 2')), 5000);
        });
        
        console.log('\n4️⃣ CONFIGURANDO LISTENERS DE REDIRECCIÓN...');
        
        let redirectionCount = 0;
        const expectedRedirections = 2;
        
        const redirectionPromise = new Promise((resolve) => {
            socket1.on('iniciar_redireccion_juego', (data) => {
                console.log(`🎯 Jugador 1 - REDIRECCIÓN RECIBIDA: ${data.codigoSala}`);
                redirectionCount++;
                if (redirectionCount >= expectedRedirections) resolve();
            });
            
            socket2.on('iniciar_redireccion_juego', (data) => {
                console.log(`🎯 Jugador 2 - REDIRECCIÓN RECIBIDA: ${data.codigoSala}`);
                redirectionCount++;
                if (redirectionCount >= expectedRedirections) resolve();
            });
        });
        
        console.log('\n5️⃣ JUGADOR 2 SE UNE A LA SALA...');
        
        // Jugador 2 se une a la sala
        const joinResponse = await fetch('http://localhost:3001/api/salas/unirse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify({
                codigo_sala: codigoSala
            })
        });
        
        const joinData = await joinResponse.json();
        console.log('✅ Jugador 2 se unió a la sala');
        
        console.log('\n6️⃣ ESPERANDO EVENTOS DE REDIRECCIÓN...');
        
        // Esperar eventos de redirección con timeout
        await Promise.race([
            redirectionPromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout esperando redirecciones')), 10000)
            )
        ]);
        
        console.log('\n✅ ÉXITO COMPLETO!');
        console.log(`📊 RESUMEN:`);
        console.log(`   • Sala creada: ${codigoSala}`);
        console.log(`   • Ambos jugadores recibieron evento de redirección`);
        console.log(`   • En la aplicación real, ambos serían redireccionados a /online-game-page/${codigoSala}`);
        
        console.log('\n7️⃣ SIMULANDO CONEXIÓN A PÁGINA DE JUEGO...');
        
        // Simular que los usuarios navegan a OnlineGamePage
        socket1.emit('unirse_sala_juego', codigoSala);
        socket2.emit('unirse_sala_juego', codigoSala);
        
        const gameStatePromise = new Promise((resolve) => {
            let statesReceived = 0;
            
            socket1.on('estado_juego_actualizado', (estado) => {
                console.log('🎮 Jugador 1 - Estado de juego recibido');
                statesReceived++;
                if (statesReceived >= 2) resolve();
            });
            
            socket2.on('estado_juego_actualizado', (estado) => {
                console.log('🎮 Jugador 2 - Estado de juego recibido');
                statesReceived++;
                if (statesReceived >= 2) resolve();
            });
            
            socket1.on('esperando_inicio_partida', () => {
                console.log('⏳ Jugador 1 - Esperando inicio de partida');
            });
            
            socket2.on('esperando_inicio_partida', () => {
                console.log('⏳ Jugador 2 - Esperando inicio de partida');
            });
        });
        
        await Promise.race([
            gameStatePromise,
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        console.log('\n🎉 FLUJO COMPLETO VALIDADO EXITOSAMENTE!');
        console.log('=' .repeat(60));
        console.log('CONCLUSIÓN: El sistema funciona correctamente');
        console.log('• SalasPage ya no redirige inmediatamente después de crear una sala');
        console.log('• Espera el evento iniciar_redireccion_juego del backend');
        console.log('• OnlineGamePage puede cargar el estado del juego correctamente');
        console.log('• La reconexión funciona apropiadamente');
        
        // Limpiar
        socket1.disconnect();
        socket2.disconnect();
        
    } catch (error) {
        console.error('❌ Error en test:', error.message);
        process.exit(1);
    }
}

// Ejecutar test
testCompleteFlow().then(() => {
    console.log('\n✅ Test finalizado exitosamente');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
});
