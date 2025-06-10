// Test script for multiplayer functionality
const { io } = require('socket.io-client');
const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3001';
let player1Socket = null;
let player2Socket = null;
let player1Token = null;
let player2Token = null;
let roomCode = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function registerUser(username, password) {
  try {
    console.log(`Registering user: ${username}`);
    const response = await axios.post(`${API_URL}/api/usuarios/registro`, {
      nombre_usuario: username,
      email: `${username}@test.com`,
      contraseña: password,
      es_anonimo: true
    });
    console.log(`User ${username} registered successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Failed to register ${username}:`, error.response?.data || error.message);
    return null;
  }
}

async function loginUser(username, password) {
  try {
    console.log(`Logging in user: ${username}`);
    const response = await axios.post(`${API_URL}/api/usuarios/login`, {
      nombre_usuario: username,
      contraseña: password
    });
    console.log(`User ${username} logged in successfully`);
    return response.data.token;
  } catch (error) {
    console.error(`Failed to login ${username}:`, error.response?.data || error.message);
    return null;
  }
}

async function createMultiplayerRoom(token) {
  try {
    console.log('Creating multiplayer room...');
    const response = await axios.post(
      `${API_URL}/api/salas/crear`,
      {
        tipo_partida: '1v1',
        puntos_victoria: 15,
        es_privada: true
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Room created successfully:', response.data);
    return response.data.codigo;
  } catch (error) {
    console.error('Failed to create room:', error.response?.data || error.message);
    return null;
  }
}

async function joinRoom(token, roomCode) {
  try {
    console.log(`Joining room: ${roomCode}`);
    const response = await axios.post(
      `${API_URL}/api/salas/unirse`,
      {
        codigo_sala: roomCode
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Joined room successfully:', response.data);
    return true;
  } catch (error) {
    console.error('Failed to join room:', error.response?.data || error.message);
    return false;
  }
}

function connectSocket(token, playerId) {
  return new Promise((resolve) => {
    console.log(`Connecting socket for player ${playerId}...`);
    
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log(`[Player ${playerId}] Socket connected with ID: ${socket.id}`);
      
      // Authenticate
      socket.emit('autenticar_socket', token);
    });
    
    socket.on('connect_error', (error) => {
      console.error(`[Player ${playerId}] Socket connection error:`, error.message);
    });
    
    socket.on('autenticacion_exitosa', (data) => {
      console.log(`[Player ${playerId}] Socket authenticated:`, data);
      resolve(socket);
    });
    
    socket.on('autenticacion_fallida', (error) => {
      console.error(`[Player ${playerId}] Socket authentication failed:`, error);
      resolve(null);
    });
    
    socket.on('error_juego', (error) => {
      console.error(`[Player ${playerId}] Game error:`, error);
    });
  });
}

function setupGameListeners(socket, playerId) {
  socket.on('estado_juego_actualizado', (state) => {
    console.log(`\n[Player ${playerId}] Received game state update:`, {
      estadoPartida: state.estadoPartida,
      jugadores: state.jugadores.map(j => ({ id: j.id, nombre: j.nombreUsuario })),
      rondaActual: state.rondaActual ? {
        numeroRonda: state.rondaActual.numeroRonda,
        jugadorManoId: state.rondaActual.jugadorManoId,
      } : null
    });
    
    if (state.rondaActual && state.rondaActual.turnoInfo) {
      console.log(`[Player ${playerId}] Current turn:`, state.rondaActual.turnoInfo.jugadorTurnoActualId);
    }
  });
  
  socket.on('esperando_inicio_partida', (data) => {
    console.log(`[Player ${playerId}] Waiting for game to start:`, data);
  });
  
  socket.on('unido_sala_juego', (data) => {
    console.log(`[Player ${playerId}] Joined game room:`, data);
    socket.emit('cliente_solicitar_estado_juego');
  });
}

async function runTest() {
  try {
    // Register and login player 1
    await registerUser('player1', 'password123');
    player1Token = await loginUser('player1', 'password123');
    if (!player1Token) throw new Error('Failed to login player 1');
    
    // Register and login player 2
    await registerUser('player2', 'password123');
    player2Token = await loginUser('player2', 'password123');
    if (!player2Token) throw new Error('Failed to login player 2');
    
    // Player 1 creates room
    roomCode = await createMultiplayerRoom(player1Token);
    if (!roomCode) throw new Error('Failed to create room');
    
    // Player 2 joins room
    const joined = await joinRoom(player2Token, roomCode);
    if (!joined) throw new Error('Player 2 failed to join room');
    
    // Connect sockets for both players
    console.log('Connecting sockets for both players...');
    player1Socket = await connectSocket(player1Token, 1);
    player2Socket = await connectSocket(player2Token, 2);
    
    if (!player1Socket || !player2Socket) {
      throw new Error('Failed to connect sockets for both players');
    }
    
    // Setup game event listeners
    setupGameListeners(player1Socket, 1);
    setupGameListeners(player2Socket, 2);
    
    // Join game room
    console.log('Joining game rooms...');
    player1Socket.emit('unirse_sala_juego', roomCode);
    player2Socket.emit('unirse_sala_juego', roomCode);
    
    // Wait for a bit to see if the game starts
    console.log('\n--- Waiting for game to initialize ---\n');
    
    // Keep script running to see events
    rl.question('Press Enter to exit test\n', () => {
      if (player1Socket) player1Socket.disconnect();
      if (player2Socket) player2Socket.disconnect();
      rl.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Test failed:', error.message);
    if (player1Socket) player1Socket.disconnect();
    if (player2Socket) player2Socket.disconnect();
    process.exit(1);
  }
}

runTest();
