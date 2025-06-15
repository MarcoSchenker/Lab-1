const { io } = require("socket.io-client");

// Configuración del socket
const socket = io("http://localhost:3001");

// Datos de prueba
const codigoSala = "TESTROOM";
const userId = 1;

// Función para simular el flujo de jugar una carta
function debugCardPlay() {
    console.log("🔍 Iniciando debug de jugar carta...");
    
    // Conectar al socket
    socket.on("connect", () => {
        console.log("✅ Conectado al servidor");
        
        // Autenticar usuario
        socket.emit("authenticate", { userId: userId });
        
        // Unirse a la sala
        socket.emit("unirse_sala_juego", codigoSala);
        
        // Obtener estado inicial
        socket.emit("obtener_estado", { codigoSala });
    });
    
    // Manejar estado inicial
    socket.on("estado_juego_actualizado", (estado) => {
        console.log("📊 Estado del juego recibido:");
        console.log("- Código sala:", estado.codigoSala);
        console.log("- Estado partida:", estado.estadoPartida);
        console.log("- Número de jugadores:", estado.jugadores?.length || 0);
        
        if (estado.jugadores && estado.jugadores.length > 0) {
            const jugadorActual = estado.jugadores.find(j => j.id === userId);
            if (jugadorActual) {
                console.log("🎯 Jugador actual:");
                console.log("- ID:", jugadorActual.id);
                console.log("- Nombre:", jugadorActual.nombreUsuario);
                console.log("- Cartas en mano:", jugadorActual.cartasMano?.length || 0);
                console.log("- Cartas:", jugadorActual.cartasMano?.map(c => `${c.numero}${c.palo}`) || []);
                
                // Verificar turno
                if (estado.jugadorTurnoActualId === userId) {
                    console.log("🎲 Es tu turno");
                    
                    // Simular jugar la primera carta
                    if (jugadorActual.cartasMano && jugadorActual.cartasMano.length > 0) {
                        const cartaAJugar = jugadorActual.cartasMano[0];
                        console.log(`🃏 Jugando carta: ${cartaAJugar.numero}${cartaAJugar.palo} (ID: ${cartaAJugar.idUnico})`);
                        
                        socket.emit("jugar_carta_ws", {
                            carta: cartaAJugar
                        });
                    }
                } else {
                    console.log("⏳ No es tu turno. Turno actual:", estado.jugadorTurnoActualId);
                }
            }
        }
        
        // Debug de ronda
        if (estado.rondaActual) {
            console.log("🔄 Ronda actual:");
            console.log("- Número:", estado.rondaActual.numeroRonda);
            console.log("- Mano actual:", estado.rondaActual.manoActual);
            
            if (estado.rondaActual.cartasEnMesa) {
                console.log("- Cartas en mesa:", estado.rondaActual.cartasEnMesa.length);
                estado.rondaActual.cartasEnMesa.forEach((cartaMesa, index) => {
                    console.log(`  ${index + 1}. Jugador ${cartaMesa.jugadorId}: ${cartaMesa.carta.numero}${cartaMesa.carta.palo}`);
                });
            }
        }
    });
    
    // Manejar carta jugada
    socket.on("carta_jugada", (datos) => {
        console.log("🎯 Carta jugada detectada:");
        console.log("- Jugador:", datos.jugadorId);
        console.log("- Carta:", datos.carta);
        console.log("- Siguiente turno:", datos.jugadorTurnoActualId);
    });
    
    // Manejar errores
    socket.on("error_juego", (error) => {
        console.error("❌ Error en juego:", error.message);
    });
    
    socket.on("error_accion_juego", (error) => {
        console.error("❌ Error en acción:", error.mensaje);
    });
    
    // Manejar desconexión
    socket.on("disconnect", () => {
        console.log("🔌 Desconectado del servidor");
    });
}

// Ejecutar debug
debugCardPlay();

// Mantener el proceso activo
process.on('SIGINT', () => {
    console.log("\n👋 Cerrando debug...");
    socket.disconnect();
    process.exit(0);
});
