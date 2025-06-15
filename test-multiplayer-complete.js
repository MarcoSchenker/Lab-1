#!/usr/bin/env node

/**
 * Test específico para simular el flujo completo de un juego multijugador
 * incluyendo el evento iniciar_redireccion_juego
 */

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

const SERVER_URL = 'http://localhost:3001';
const JWT_SECRET = 'my_super_secret_secure_key';

console.log('🎮 TEST COMPLETO DE JUEGO MULTIJUGADOR');
console.log('=' .repeat(60));

// Simular dos usuarios para juego completo
const testUsers = [
  { id: 1, nombre_usuario: 'Jugador1', email: 'jugador1@test.com' },
  { id: 2, nombre_usuario: 'Jugador2', email: 'jugador2@test.com' }
];

const tokens = testUsers.map(user => 
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' })
);

async function testCompleteMultiplayerFlow() {
  console.log('\n🚀 Iniciando test de flujo completo...\n');

  try {
    // PASO 1: Crear sala con el primer jugador
    console.log('👤 PASO 1: Jugador 1 crea una sala...');
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
    console.log(`✅ Sala creada: ${codigoSala}`);

    // Verificar que la sala existe
    const verificarResponse = await fetch(`${SERVER_URL}/api/salas/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens[0]}`
      }
    });

    if (verificarResponse.ok) {
      const salas = await verificarResponse.json();
      const salaEncontrada = salas.find(s => s.codigo_sala === codigoSala);
      if (salaEncontrada) {
        console.log(`✅ Sala verificada: ${codigoSala} - Estado: ${salaEncontrada.estado || 'N/A'}`);
      } else {
        console.log(`⚠️ Sala ${codigoSala} no encontrada en la lista de salas`);
      }
    }

    // PASO 2: Conectar ambos jugadores en paralelo
    console.log('\n👥 PASO 2: Conectando ambos jugadores...');
    
    const jugadores = await Promise.all(
      testUsers.map((user, index) => connectPlayer(user, tokens[index], codigoSala))
    );

    console.log('✅ Ambos jugadores conectados');

    // PASO 3: Segundo jugador se une a la sala (esto debería disparar iniciar_redireccion_juego)
    console.log('\n🏠 PASO 3: Jugador 2 se une a la sala...');
    
    const joinResponse = await fetch(`${SERVER_URL}/api/salas/unirse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens[1]}`
      },
      body: JSON.stringify({
        codigo_sala: codigoSala
      })
    });

    if (!joinResponse.ok) {
      throw new Error(`Error uniéndose a sala: ${joinResponse.status}`);
    }

    console.log('✅ Jugador 2 se unió a la sala');

    // PASO 4: Esperar eventos de redirección y estado
    console.log('\n⏳ PASO 4: Esperando eventos de juego...');
    
    await new Promise((resolve) => {
      let redirectionsReceived = 0;
      let gamesStatesReceived = 0;
      
      jugadores.forEach((jugador, index) => {
        jugador.socket.on('iniciar_redireccion_juego', (data) => {
          console.log(`🎯 ${testUsers[index].nombre_usuario} recibió iniciar_redireccion_juego:`, data);
          redirectionsReceived++;
          
          // Simular la navegación a la página del juego
          setTimeout(() => {
            jugador.socket.emit('unirse_sala_juego', data.codigo_sala);
          }, 500);
        });

        jugador.socket.on('unido_sala_juego', (data) => {
          console.log(`🏠 ${testUsers[index].nombre_usuario} se unió a sala de juego:`, data);
          jugador.socket.emit('solicitar_estado_juego_ws');
        });

        jugador.socket.on('estado_juego_actualizado', (estado) => {
          console.log(`🎮 ${testUsers[index].nombre_usuario} recibió estado del juego:`, {
            equipos: estado.equipos?.length || 0,
            jugadores: estado.jugadores?.length || 0,
            estadoPartida: estado.estadoPartida
          });
          gamesStatesReceived++;
          
          if (redirectionsReceived >= 2 && gamesStatesReceived >= 2) {
            console.log('\n🎉 ¡FLUJO COMPLETO EXITOSO!');
            resolve();
          }
        });

        jugador.socket.on('esperando_inicio_partida', (data) => {
          console.log(`⏳ ${testUsers[index].nombre_usuario} en espera:`, data);
          // También contar esto como estado válido
          gamesStatesReceived++;
          
          if (redirectionsReceived >= 2 && gamesStatesReceived >= 1) {
            console.log('\n✅ Flujo parcial exitoso (esperando inicio)');
            resolve();
          }
        });

        jugador.socket.on('partida_iniciada', (estado) => {
          console.log(`🚀 ${testUsers[index].nombre_usuario} - Partida iniciada!`);
          gamesStatesReceived++;
          
          if (redirectionsReceived >= 2 && gamesStatesReceived >= 2) {
            console.log('\n🎉 ¡PARTIDA INICIADA EXITOSAMENTE!');
            resolve();
          }
        });
      });

      // Timeout de seguridad
      setTimeout(() => {
        console.log(`\n⏱️ Timeout - Eventos recibidos:`);
        console.log(`  - Redirecciones: ${redirectionsReceived}/2`);
        console.log(`  - Estados de juego: ${gamesStatesReceived}/2`);
        resolve();
      }, 15000);
    });

    // PASO 5: Cleanup
    console.log('\n🧹 PASO 5: Limpiando conexiones...');
    jugadores.forEach(jugador => {
      jugador.socket.disconnect();
    });

    console.log('✅ Test completo finalizado');

  } catch (error) {
    console.error('❌ Error en test completo:', error.message);
  }
}

async function connectPlayer(user, token, codigoSala) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    const timeout = setTimeout(() => {
      reject(new Error(`Timeout conectando ${user.nombre_usuario}`));
    }, 10000);

    socket.on('connect', () => {
      console.log(`🔌 ${user.nombre_usuario} conectado`);
      socket.emit('autenticar_socket', token);
    });

    socket.on('autenticacion_exitosa', () => {
      console.log(`🔐 ${user.nombre_usuario} autenticado`);
      // Unirse a la sala de lobby para recibir eventos de redirección
      socket.emit('unirse_sala_lobby', codigoSala);
      clearTimeout(timeout);
      resolve({ socket, user });
    });

    socket.on('autenticacion_fallida', (error) => {
      console.error(`❌ ${user.nombre_usuario} falló autenticación:`, error);
      clearTimeout(timeout);
      reject(new Error(`Autenticación fallida para ${user.nombre_usuario}`));
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ ${user.nombre_usuario} error de conexión:`, error.message);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Ejecutar test
async function main() {
  try {
    await testCompleteMultiplayerFlow();
    console.log('\n🎯 TEST COMPLETO FINALIZADO');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }
}

main().catch(console.error);
