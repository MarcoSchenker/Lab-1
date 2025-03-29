// Importar módulos
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Inicializar Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint básico
app.get('/', (req, res) => {
    res.send('Servidor Truco está activo 🎴');
});

// WebSocket básico
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado');

    socket.on('disconnect', () => {
        console.log('Jugador desconectado');
    });
});

// Arrancar el servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🔥 Servidor escuchando en http://localhost:${PORT}`);
});
