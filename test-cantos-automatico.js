const io = require('socket.io-client');

// Configuración de prueba
const BACKEND_URL = 'http://localhost:3001';
const SALA_TEST = 'test_cantos_123';

class TestPlayer {
    constructor(userId, userName, isHost = false) {
        this.userId = userId;
        this.userName = userName;
        this.isHost = isHost;
        this.socket = null;
        this.estadoJuego = null;
        this.cartas = [];
        this.connected = false;
    }

    async conectar() {
        return new Promise((resolve, reject) => {
            console.log(`[${this.userName}] 🔗 Conectando...`);
            
            this.socket = io(BACKEND_URL);

            this.socket.on('connect', () => {
                console.log(`[${this.userName}] ✅ Conectado`);
                this.socket.emit('authenticate_user', { 
                    userId: this.userId, 
                    userName: this.userName 
                });
            });

            this.socket.on('authenticated', (data) => {
                console.log(`[${this.userName}] ✅ Autenticado`);
                this.connected = true;
                resolve();
            });

            this.socket.on('estado_juego_actualizado', (estado) => {
                this.estadoJuego = estado;
                const miJugador = estado.jugadores?.find(j => j.id === this.userId);
                if (miJugador) {
                    this.cartas = miJugador.cartasMano || [];
                    console.log(`[${this.userName}] 🃏 Tengo ${this.cartas.length} cartas`);
                    if (this.cartas.length > 0) {
                        console.log(`[${this.userName}] Cartas: ${this.cartas.map(c => `${c.numero}${c.palo}`).join(', ')}`);
                    }
                }
                
                if (estado.rondaActual?.turnoInfo?.jugadorTurnoActualId === this.userId) {
                    console.log(`[${this.userName}] 🎯 Es mi turno!`);
                }
                
                // Debug de envido
                if (estado.rondaActual?.envidoInfo?.cantado) {
                    console.log(`[${this.userName}] 🎵 Envido cantado: ${estado.rondaActual.envidoInfo.valorTipoCantoActual}`);
                }
            });

            this.socket.on('canto_realizado', (data) => {
                console.log(`[${this.userName}] 🎵 Canto: ${data.tipo_canto} por jugador ${data.jugadorId}`);
                if (data.esCantoEncadenado) {
                    console.log(`[${this.userName}] 🔗 ¡Canto encadenado!`);
                }
            });

            this.socket.on('error_juego', (error) => {
                console.log(`[${this.userName}] ❌ Error: ${error.message}`);
            });

            this.socket.on('disconnect', () => {
                console.log(`[${this.userName}] ❌ Desconectado`);
                this.connected = false;
            });

            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Timeout de conexión'));
                }
            }, 5000);
        });
    }

    unirseASala() {
        if (!this.socket) return;
        console.log(`[${this.userName}] 🏁 Uniéndose a sala ${SALA_TEST}`);
        this.socket.emit('unirse_sala_juego', SALA_TEST);
    }

    cantarEnvido() {
        if (!this.socket) return;
        console.log(`[${this.userName}] 🎵 Cantando ENVIDO`);
        this.socket.emit('cantar_ws', { 
            codigoSala: SALA_TEST, 
            tipoCanto: 'ENVIDO' 
        });
    }

    cantarRealEnvido() {
        if (!this.socket) return;
        console.log(`[${this.userName}] 🎵 Cantando REAL ENVIDO`);
        this.socket.emit('cantar_ws', { 
            codigoSala: SALA_TEST, 
            tipoCanto: 'REAL_ENVIDO' 
        });
    }

    responderQuiero() {
        if (!this.socket) return;
        console.log(`[${this.userName}] ✅ Respondiendo QUIERO`);
        this.socket.emit('responder_canto_ws', { 
            codigoSala: SALA_TEST, 
            respuesta: 'QUIERO' 
        });
    }

    responderNoQuiero() {
        if (!this.socket) return;
        console.log(`[${this.userName}] ❌ Respondiendo NO QUIERO`);
        this.socket.emit('responder_canto_ws', { 
            codigoSala: SALA_TEST, 
            respuesta: 'NO_QUIERO' 
        });
    }

    jugarPrimeraCarta() {
        if (!this.socket || !this.cartas || this.cartas.length === 0) {
            console.log(`[${this.userName}] ❌ No tengo cartas para jugar`);
            return;
        }
        
        const carta = this.cartas[0];
        console.log(`[${this.userName}] 🃏 Jugando: ${carta.numero} de ${carta.palo}`);
        this.socket.emit('jugar_carta_ws', { 
            codigoSala: SALA_TEST, 
            idUnicoCarta: carta.idUnico 
        });
    }

    declararPuntos(puntos) {
        if (!this.socket) return;
        console.log(`[${this.userName}] 🔢 Declarando ${puntos} puntos`);
        this.socket.emit('declarar_puntos_envido_ws', { 
            codigoSala: SALA_TEST, 
            puntos: puntos 
        });
    }

    desconectar() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

async function crearPartida() {
    console.log('🎮 Creando partida de prueba...');
    
    // Simulamos la creación de partida (normalmente se haría por HTTP)
    const fetch = require('node-fetch');
    
    try {
        const response = await fetch('http://localhost:3001/api/salas/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tipo_partida: '1v1',
                puntos_victoria: 15,
                jugadores: [
                    { id: 1, nombre_usuario: 'nacu' },
                    { id: 2, nombre_usuario: 'marco' }
                ]
            })
        });

        const result = await response.json();
        console.log('🎯 Respuesta de creación:', result);
        return result.codigo_sala || SALA_TEST;
    } catch (error) {
        console.log('⚠️ Error creando partida, usando sala por defecto:', error.message);
        return SALA_TEST;
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCantos() {
    console.log('🚀 Iniciando test de cantos encadenados...\n');

    // Crear jugadores
    const nacu = new TestPlayer(1, 'nacu', true);
    const marco = new TestPlayer(2, 'marco');

    try {
        // Conectar jugadores
        await nacu.conectar();
        await marco.conectar();
        
        // Crear partida
        const salaCreada = await crearPartida();
        console.log(`🏁 Sala creada: ${salaCreada}\n`);
        
        await sleep(1000);
        
        // Unirse a la sala
        nacu.unirseASala();
        marco.unirseASala();
        
        await sleep(2000);
        
        console.log('=== TEST 1: Canto simple de ENVIDO ===');
        nacu.cantarEnvido();
        
        await sleep(1000);
        
        console.log('=== TEST 2: Respuesta con canto encadenado ===');
        marco.cantarRealEnvido(); // Esto debería funcionar con el fix
        
        await sleep(1000);
        
        console.log('=== TEST 3: Responder QUIERO ===');
        nacu.responderQuiero();
        
        await sleep(1000);
        
        console.log('=== TEST 4: Declarar puntos ===');
        nacu.declararPuntos(25);
        
        await sleep(1000);
        
        marco.declararPuntos(27);
        
        await sleep(2000);
        
        console.log('=== TEST COMPLETADO ===');
        
    } catch (error) {
        console.error('❌ Error en test:', error);
    } finally {
        // Limpiar
        nacu.desconectar();
        marco.desconectar();
        
        // Salir del proceso después de un delay
        setTimeout(() => {
            console.log('🏁 Test finalizado');
            process.exit(0);
        }, 2000);
    }
}

// Ejecutar test
testCantos().catch(console.error);
