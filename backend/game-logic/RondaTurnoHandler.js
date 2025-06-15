const Naipe = require('./Naipe'); // Assuming Naipe class is in Naipe.js

class RondaTurnoHandler {
    /**
     * @param {RondaGame} ronda Instancia de la ronda actual.
     */
    constructor(ronda) {
        this.ronda = ronda; // Referencia a la instancia de RondaGame
        this.cartasEnMesaManoActual = []; // [{ jugadorId, equipoId, carta: Naipe, ordenJugada: number }]
        this.manosJugadas = []; // [{ numeroMano, jugadas: [], ganadorManoEquipoId, ganadorManoJugadorId, fueParda, jugadorQueInicioManoId }]
        this.manoActualNumero = 1;
        this.jugadorTurnoActual = null;
        this.indiceJugadorTurnoActual = 0; // Indice en this.ronda.jugadoresEnOrden
    }

    repartirCartas() {
        this.ronda.mazo.mezclar();
        this.ronda.jugadoresEnOrden.forEach(jugador => {
            jugador.limpiarParaNuevaRonda(); // Limpia cartasMano y cartasJugadasRonda
            const cartas = this.ronda.mazo.repartir(3);
            jugador.recibirCartas(cartas);
        });
        console.log("Cartas repartidas a todos los jugadores.");
    }

    establecerPrimerTurno() {
        if (!this.ronda.jugadorManoRonda) {
            console.error("RondaTurnoHandler: jugadorManoRonda no está definido en la ronda.");
            // Fallback al primer jugador en orden si no hay mano definida (no debería ocurrir)
            this.indiceJugadorTurnoActual = 0;
        } else {
            this.indiceJugadorTurnoActual = this.ronda.jugadoresEnOrden.findIndex(j => j.id === this.ronda.jugadorManoRonda.id);
            if (this.indiceJugadorTurnoActual === -1) {
                console.error("RondaTurnoHandler: Jugador mano de ronda no encontrado en jugadoresEnOrden. Fallback al índice 0.");
                this.indiceJugadorTurnoActual = 0;
            }
        }
        this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
        if (this.jugadorTurnoActual) {
            console.log(`Primer turno establecido para: ${this.jugadorTurnoActual.nombreUsuario}`);
            this.ronda._actualizarEstadoParaNotificar('turno_actualizado', { jugadorTurnoActualId: this.jugadorTurnoActual.id });
        } else {
            console.error("RondaTurnoHandler: No se pudo establecer el primer turno, jugadorTurnoActual es null.");
        }
    }

    siguienteTurno() {
        this.indiceJugadorTurnoActual = (this.indiceJugadorTurnoActual + 1) % this.ronda.jugadoresEnOrden.length;
        this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
        console.log(`Siguiente turno para: ${this.jugadorTurnoActual.nombreUsuario}`);
        this.ronda._actualizarEstadoParaNotificar('turno_actualizado', { jugadorTurnoActualId: this.jugadorTurnoActual.id });
    }

    setTurnoA(jugadorId) {
        const indice = this.ronda.jugadoresEnOrden.findIndex(j => j.id === jugadorId);
        if (indice !== -1) {
            this.indiceJugadorTurnoActual = indice;
            this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
            console.log(`Turno asignado directamente a: ${this.jugadorTurnoActual.nombreUsuario}`);
            this.ronda._actualizarEstadoParaNotificar('turno_actualizado', { jugadorTurnoActualId: this.jugadorTurnoActual.id });
        } else {
            console.error(`RondaTurnoHandler: Error al intentar setear turno a jugador ${jugadorId} no encontrado.`);
            // Podría ser necesario un fallback o lanzar un error más severo.
        }
    }

    registrarJugada(jugadorId, idUnicoCarta) {
        if (!this.jugadorTurnoActual || this.jugadorTurnoActual.id !== jugadorId) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno para jugar una carta.' });
            return false;
        }
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta() || this.ronda.trucoHandler.estaPendienteDeRespuesta()) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Debes responder al canto pendiente antes de jugar.' });
            return false;
        }

        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugador) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Jugador no encontrado.' });
            return false;
        }

        const cartaJugada = jugador.jugarCarta(idUnicoCarta);
        if (!cartaJugada) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Carta no válida o no la tienes.' });
            return false;
        }

        this.cartasEnMesaManoActual.push({
            jugadorId: jugador.id,
            equipoId: jugador.equipoId,
            carta: cartaJugada, // Naipe object
            ordenJugada: this.cartasEnMesaManoActual.length + 1
        });
        
        // Notificar al envido handler si es relevante (ej. para bloquear envido después de ciertas jugadas)
        this.ronda.envidoHandler.onCartaJugada(jugadorId, this.cartasEnMesaManoActual.length); 

        this.ronda.persistirAccion({
            tipo_accion: 'JUGAR_CARTA',
            usuario_id_accion: jugadorId,
            detalle_accion: { carta_jugada: cartaJugada.toJSON(), mano_numero: this.manoActualNumero }
        });
        this.ronda._actualizarEstadoParaNotificar('carta_jugada', { jugadorId, carta: cartaJugada.toJSON(), jugadorTurnoActualId: this.jugadorTurnoActual.id });

        if (this.cartasEnMesaManoActual.length === this.ronda.jugadoresEnOrden.length) {
            this.finalizarManoActual();
        } else {
            this.siguienteTurno();
        }
        return true;
    }

    finalizarManoActual() {
        console.log(`Finalizando mano ${this.manoActualNumero}. Cartas en mesa: ${this.cartasEnMesaManoActual.length}`);
        let ganadorManoJugador = null; // El jugador específico que ganó
        let ganadorManoEquipoId = null;
        let fueParda = false;
        
        if (this.cartasEnMesaManoActual.length === 0) {
            console.error("Error: finalizarManoActual llamada sin cartas en la mesa.");
            return; // No debería ocurrir
        }

        let jugadasOrdenadas = [...this.cartasEnMesaManoActual].sort((a,b) => b.carta.valorTruco - a.carta.valorTruco);
        const cartaMasAltaGeneralValor = jugadasOrdenadas[0].carta.valorTruco;
        
        const mejoresJugadas = jugadasOrdenadas.filter(j => j.carta.valorTruco === cartaMasAltaGeneralValor);

        if (mejoresJugadas.length === 1) {
            ganadorManoJugador = this.ronda.jugadoresEnOrden.find(j => j.id === mejoresJugadas[0].jugadorId);
            ganadorManoEquipoId = mejoresJugadas[0].equipoId;
        } else { // Empate en valor de carta
            const primerEquipoEmpatado = mejoresJugadas[0].equipoId;
            const todosDelMismoEquipo = mejoresJugadas.every(j => j.equipoId === primerEquipoEmpatado);

            if (todosDelMismoEquipo) {
                // Gana el equipo, el jugador específico es el que jugó primero entre los empatados de ese equipo.
                ganadorManoJugador = this.ronda.jugadoresEnOrden.find(j => j.id === mejoresJugadas.sort((a,b) => a.ordenJugada - b.ordenJugada)[0].jugadorId);
                ganadorManoEquipoId = primerEquipoEmpatado;
            } else { // Empate entre diferentes equipos
                if (this.manoActualNumero === 1) {
                    const manoDeRondaEstaEnEmpate = mejoresJugadas.some(j => j.jugadorId === this.ronda.jugadorManoRonda.id);
                    if (manoDeRondaEstaEnEmpate) {
                        ganadorManoJugador = this.ronda.jugadorManoRonda;
                        ganadorManoEquipoId = ganadorManoJugador.equipoId;
                    } else {
                        fueParda = true; // Parda si el mano de la ronda no está en el empate de la primera
                    }
                } else {
                    fueParda = true; // En 2da o 3ra mano, empate entre equipos es parda
                }
            }
        }

        const jugadorQueInicioManoId = this.cartasEnMesaManoActual.length > 0 ? this.cartasEnMesaManoActual[0].jugadorId : null;

        this.manosJugadas.push({
            numeroMano: this.manoActualNumero,
            jugadas: this.cartasEnMesaManoActual.map(j => ({...j, carta: j.carta.toJSON()})), // Guardar copia
            ganadorManoEquipoId: ganadorManoEquipoId,
            ganadorManoJugadorId: ganadorManoJugador ? ganadorManoJugador.id : null,
            fueParda: fueParda,
            jugadorQueInicioManoId: jugadorQueInicioManoId
        });

        if (ganadorManoEquipoId) console.log(`Ganador de la mano ${this.manoActualNumero}: Equipo ${ganadorManoEquipoId} (Jugador: ${ganadorManoJugador ? ganadorManoJugador.nombreUsuario : 'N/A'})`);
        else if (fueParda) console.log(`Mano ${this.manoActualNumero} fue parda.`);
        
        this.ronda._actualizarEstadoParaNotificar('mano_finalizada', { 
            numeroMano: this.manoActualNumero, 
            ganadorManoEquipoId, 
            ganadorManoJugadorId: ganadorManoJugador ? ganadorManoJugador.id : null,
            fueParda, 
            jugadas: this.cartasEnMesaManoActual.map(j => ({...j, carta: j.carta.toJSON()}))
        });

        if (this.verificarFinDeRonda()) {
            this.ronda._finalizarRondaLogica();
        } else {
            this.manoActualNumero++;
            this.iniciarNuevaMano(); 
        }
    }

    iniciarNuevaMano() {
        this.cartasEnMesaManoActual = [];
        let proximoJugadorId = null;

        if (this.manosJugadas.length > 0) {
            const ultimaMano = this.manosJugadas[this.manosJugadas.length - 1];
            if (ultimaMano.ganadorManoJugadorId) { // Si un jugador específico ganó la mano anterior
                proximoJugadorId = ultimaMano.ganadorManoJugadorId;
            } else if (ultimaMano.fueParda) { // Si la última mano fue parda
                proximoJugadorId = ultimaMano.jugadorQueInicioManoId; // Inicia el que empezó la mano parda
            }
        }
        
        if (!proximoJugadorId) { // Si es la primera mano (manosJugadas está vacío) o fallback
            proximoJugadorId = this.ronda.jugadorManoRonda.id;
        }
        
        this.setTurnoA(proximoJugadorId);
        console.log(`Iniciando mano ${this.manoActualNumero}. Turno para: ${this.jugadorTurnoActual.nombreUsuario}`);
    }
    
    verificarFinDeRonda() {
        const conteoVictoriasPorEquipo = {};
        this.ronda.equipos.forEach(eq => conteoVictoriasPorEquipo[eq.id] = 0);

        for (const mano of this.manosJugadas) {
            if (mano.ganadorManoEquipoId && !mano.fueParda) {
                conteoVictoriasPorEquipo[mano.ganadorManoEquipoId]++;
                if (conteoVictoriasPorEquipo[mano.ganadorManoEquipoId] === 2) {
                    this.ronda.ganadorRondaEquipoId = mano.ganadorManoEquipoId;
                    console.log(`Ronda finalizada. Ganador por 2 manos: Equipo ${this.ronda.ganadorRondaEquipoId}`);
                    return true;
                }
            }
        }

        if (this.manosJugadas.length === 2) {
            const [mano1, mano2] = this.manosJugadas;
            if (mano1.fueParda && mano2.ganadorManoEquipoId) {
                this.ronda.ganadorRondaEquipoId = mano2.ganadorManoEquipoId;
                 console.log(`Ronda finalizada. Ganador por parda en 1ra, gana 2da: Equipo ${this.ronda.ganadorRondaEquipoId}`);
                return true;
            }
            if (mano1.ganadorManoEquipoId && mano2.fueParda) { // Gana el que ganó la primera si la segunda es parda
                this.ronda.ganadorRondaEquipoId = mano1.ganadorManoEquipoId;
                console.log(`Ronda finalizada. Ganador por ganar 1ra, parda en 2da: Equipo ${this.ronda.ganadorRondaEquipoId}`);
                return true;
            }
        }
        
        if (this.manosJugadas.length === 3) {
            this.determinarGanadorRondaPorManos(); // Esto setea this.ronda.ganadorRondaEquipoId
            console.log(`Ronda finalizada después de 3 manos. Ganador: Equipo ${this.ronda.ganadorRondaEquipoId}`);
            return true;
        }
        return false;
    }
    
    determinarGanadorRondaPorManos() {
        // Esta función se llama si se jugaron las 3 manos o si las reglas de parda llevan a este punto.
        const conteoVictorias = {};
        this.ronda.equipos.forEach(eq => conteoVictorias[eq.id] = 0);
        this.manosJugadas.forEach(m => {
            if(m.ganadorManoEquipoId) conteoVictorias[m.ganadorManoEquipoId]++;
        });

        const equipoIds = this.ronda.equipos.map(e => e.id);

        if (conteoVictorias[equipoIds[0]] > conteoVictorias[equipoIds[1]]) {
            this.ronda.ganadorRondaEquipoId = equipoIds[0];
        } else if (conteoVictorias[equipoIds[1]] > conteoVictorias[equipoIds[0]]) {
            this.ronda.ganadorRondaEquipoId = equipoIds[1];
        } else { // Empate en manos ganadas (e.g., 1-1 y 1 parda, o 3 pardas)
            // Si la primera mano fue parda, y la segunda también, gana el que gane la tercera.
            // Si la primera mano fue parda, y la segunda la ganó un equipo, ese equipo gana la ronda. (Ya cubierto en verificarFinDeRonda)
            // Si las tres manos son pardas, gana el equipo del mano de la ronda.
            if (this.manosJugadas.every(m => m.fueParda)) {
                this.ronda.ganadorRondaEquipoId = this.ronda.jugadorManoRonda.equipoId;
            } 
            // Si 1ra y 2da parda, y 3ra ganada (ya cubierto por conteoVictorias)
            // Si 1ra ganada, 2da parda, 3ra parda -> gana el de la 1ra
            else if (this.manosJugadas[0].ganadorManoEquipoId && this.manosJugadas[1].fueParda && this.manosJugadas[2].fueParda) {
                 this.ronda.ganadorRondaEquipoId = this.manosJugadas[0].ganadorManoEquipoId;
            }
            // Si 1ra parda, 2da ganada, 3ra parda -> gana el de la 2da
            else if (this.manosJugadas[0].fueParda && this.manosJugadas[1].ganadorManoEquipoId && this.manosJugadas[2].fueParda) {
                 this.ronda.ganadorRondaEquipoId = this.manosJugadas[1].ganadorManoEquipoId;
            }
            // Si hay empate 1-1 en victorias y una parda, gana el que ganó la primera mano no parda.
            // O más simple: si la primera mano tuvo un ganador, ese equipo gana en caso de empate 1-1.
            else if (this.manosJugadas[0].ganadorManoEquipoId) {
                 this.ronda.ganadorRondaEquipoId = this.manosJugadas[0].ganadorManoEquipoId;
            } else if (this.manosJugadas[0].fueParda && this.manosJugadas[1].ganadorManoEquipoId) { // 1ra parda, 2da ganada, 3ra perdida por el ganador de la 2da
                 this.ronda.ganadorRondaEquipoId = this.manosJugadas[1].ganadorManoEquipoId;
            }
             else { // Fallback si la lógica anterior no cubre todo, debería ser el mano de la ronda en empates no resueltos.
                this.ronda.ganadorRondaEquipoId = this.ronda.jugadorManoRonda.equipoId;
                console.warn("DeterminarGanadorRondaPorManos: Cayó en fallback, ganador es mano de ronda. Manos:", this.manosJugadas);
            }
        }
    }

    determinarProximoJugadorParaCarta() {
        // Devuelve el ID del jugador que debe jugar la próxima carta.
        // Esto es útil para restaurar el turno después de un envido, por ejemplo.
        return this.jugadorTurnoActual ? this.jugadorTurnoActual.id : null;
    }

    getEstado() {
        console.log(`[TURNO] getEstado() llamado - jugadorTurnoActual:`, {
            existe: !!this.jugadorTurnoActual,
            id: this.jugadorTurnoActual?.id,
            nombre: this.jugadorTurnoActual?.nombreUsuario,
            indice: this.indiceJugadorTurnoActual
        });
        
        return {
            cartasEnMesaManoActual: this.cartasEnMesaManoActual.map(j => ({ ...j, carta: j.carta.toJSON() })),
            manosJugadas: this.manosJugadas.map(m => ({
                ...m, 
                jugadas: m.jugadas // Ya están en formato JSON si vienen de this.manosJugadas
            })),
            manoActualNumero: this.manoActualNumero,
            jugadorTurnoActualId: this.jugadorTurnoActual ? this.jugadorTurnoActual.id : null,
        };
    }
}

module.exports = RondaTurnoHandler;