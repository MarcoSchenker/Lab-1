class RondaTurnoHandler {
    /**
     * @param {RondaGame} ronda Instancia de la ronda actual.
     */
    constructor(ronda) {
        this.ronda = ronda; // Referencia a la instancia de RondaGame
        this.cartasEnMesaManoActual = []; // [{ jugadorId, equipoId, carta, ordenJugada }]
        this.manosJugadas = []; // [{ numeroMano, jugadas: [], ganadorManoEquipoId, fueParda }]
        this.manoActualNumero = 1;
        this.jugadorTurnoActual = null;
        this.indiceJugadorTurnoActual = 0;
    }

    iniciarNuevaMano() {
        this.cartasEnMesaManoActual = [];
        // El ganador de la mano anterior (o el mano de la ronda si es la primera mano o hubo parda) inicia.
        // Esta lógica se refinará.
        if (this.manosJugadas.length > 0) {
            const ultimaMano = this.manosJugadas[this.manosJugadas.length - 1];
            if (ultimaMano.ganadorManoEquipoId) {
                const ganadorUltimaMano = this.ronda.jugadoresEnOrden.find(j => j.equipoId === ultimaMano.ganadorManoEquipoId && j.cartasJugadasRonda.length < this.manoActualNumero); // Simplificación
                 // Hay que buscar al jugador específico que ganó la mano para que inicie la siguiente.
                 // Esto es complejo si el ganador fue por la carta más alta de un equipo.
                 // Por ahora, el primer jugador del equipo ganador que aún tiene cartas por jugar en la ronda.
                const primerJugadorEquipoGanador = this.ronda.jugadoresEnOrden.find(j => j.equipoId === ultimaMano.ganadorManoEquipoId);
                if(primerJugadorEquipoGanador) this.setTurnoA(primerJugadorEquipoGanador.id);

            } else { // Parda
                const jugadorQueInicioManoParda = ultimaMano.jugadas[0].jugadorId;
                this.setTurnoA(jugadorQueInicioManoParda);
            }
        } else {
             this.setTurnoA(this.ronda.jugadorManoRonda.id);
        }
    }

    repartirCartas() {
        this.ronda.mazo.mezclar();
        this.ronda.jugadoresEnOrden.forEach(jugador => {
            jugador.limpiarParaNuevaRonda();
            const cartas = this.ronda.mazo.repartir(3);
            jugador.recibirCartas(cartas);
        });
    }

    establecerPrimerTurno() {
        this.indiceJugadorTurnoActual = this.ronda.jugadoresEnOrden.findIndex(j => j.id === this.ronda.jugadorManoRonda.id);
        if (this.indiceJugadorTurnoActual === -1) {
            console.error("RondaTurnoHandler: Jugador mano no encontrado.");
            this.indiceJugadorTurnoActual = 0;
        }
        this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
        this.ronda._actualizarEstadoParaNotificar('turno_actualizado');
    }

    siguienteTurno() {
        this.indiceJugadorTurnoActual = (this.indiceJugadorTurnoActual + 1) % this.ronda.jugadoresEnOrden.length;
        this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
        console.log(`Turno de: ${this.jugadorTurnoActual.nombreUsuario}`);
        this.ronda._actualizarEstadoParaNotificar('turno_actualizado');
    }

    setTurnoA(jugadorId) {
        const indice = this.ronda.jugadoresEnOrden.findIndex(j => j.id === jugadorId);
        if (indice !== -1) {
            this.indiceJugadorTurnoActual = indice;
            this.jugadorTurnoActual = this.ronda.jugadoresEnOrden[this.indiceJugadorTurnoActual];
            console.log(`Turno asignado a: ${this.jugadorTurnoActual.nombreUsuario}`);
            this.ronda._actualizarEstadoParaNotificar('turno_actualizado');
        } else {
            console.error(`RondaTurnoHandler: Error al intentar setear turno a jugador ${jugadorId} no encontrado.`);
        }
    }

    registrarJugada(jugadorId, idUnicoCarta) {
        if (this.jugadorTurnoActual.id !== jugadorId) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno.' });
            return false;
        }
        // Validar si el envido o truco están pendientes de respuesta
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta() || this.ronda.trucoHandler.estaPendienteDeRespuesta()) {
             this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Debes responder al canto pendiente antes de jugar.' });
            return false;
        }

        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugador) return false;

        const cartaJugada = jugador.jugarCarta(idUnicoCarta);
        if (!cartaJugada) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Carta no válida o no la tienes.' });
            return false;
        }

        this.cartasEnMesaManoActual.push({
            jugadorId: jugador.id,
            equipoId: jugador.equipoId,
            carta: cartaJugada,
            ordenJugada: this.cartasEnMesaManoActual.length + 1
        });
        
        this.ronda.envidoHandler.onCartaJugada(jugadorId, this.cartasEnMesaManoActual.length); // Notificar al envido handler

        this.ronda.persistirAccion({
            tipo_accion: 'JUGAR_CARTA',
            usuario_id_accion: jugadorId,
            detalle_accion: { carta_jugada: cartaJugada, mano_numero: this.manoActualNumero }
        });
        this.ronda._actualizarEstadoParaNotificar('carta_jugada', { jugadorId, carta: cartaJugada });

        if (this.cartasEnMesaManoActual.length === this.ronda.jugadoresEnOrden.length) {
            this.finalizarManoActual();
        } else {
            this.siguienteTurno();
        }
        return true;
    }

    finalizarManoActual() {
        console.log(`Finalizando mano ${this.manoActualNumero}`);
        let ganadorMano = null;
        let cartaMasAltaGeneral = null;
        let fueParda = false;
        
        let jugadasOrdenadas = [...this.cartasEnMesaManoActual].sort((a,b) => b.carta.valorTruco - a.carta.valorTruco);
        cartaMasAltaGeneral = jugadasOrdenadas[0].carta;
        
        const mejoresJugadas = jugadasOrdenadas.filter(j => j.carta.valorTruco === cartaMasAltaGeneral.valorTruco);

        if (mejoresJugadas.length > 1) { // Empate en valor de carta
            // Si todas las cartas empatadas son del mismo equipo, ese equipo gana la mano.
            const primerEquipoEmpatado = mejoresJugadas[0].equipoId;
            const todosDelMismoEquipo = mejoresJugadas.every(j => j.equipoId === primerEquipoEmpatado);

            if (todosDelMismoEquipo) {
                ganadorMano = this.ronda.jugadoresEnOrden.find(j => j.id === mejoresJugadas[0].jugadorId); // El jugador específico no importa tanto como el equipo
            } else { // Empate entre diferentes equipos
                if (this.manoActualNumero === 1) { // Primera mano
                    // Gana el equipo del jugador que es mano de la ronda, si está entre los empatados.
                    const manoEstaEnEmpate = mejoresJugadas.some(j => j.jugadorId === this.ronda.jugadorManoRonda.id);
                    if (manoEstaEnEmpate) {
                        ganadorMano = this.ronda.jugadorManoRonda;
                    } else {
                        // Si el mano no está en el empate de la primera, es parda. (Regla a confirmar, usualmente gana el mano)
                        // Asumiendo que si hay empate real entre equipos distintos y el mano no está, es parda.
                        // O, si el mano está, pero hay otro equipo con la misma carta más alta, gana el mano.
                        // Simplificación: si el mano está en las mejores jugadas, su equipo gana.
                         ganadorMano = this.ronda.jugadoresEnOrden.find(j => j.id === this.ronda.jugadorManoRonda.id);
                    }
                } else { // Segunda o tercera mano
                    fueParda = true;
                }
            }
        } else { // Un solo jugador con la carta más alta
            ganadorMano = this.ronda.jugadoresEnOrden.find(j => j.id === mejoresJugadas[0].jugadorId);
        }

        let ganadorManoEquipoId = null;
        if (ganadorMano && !fueParda) {
            ganadorManoEquipoId = ganadorMano.equipoId;
            console.log(`Ganador de la mano ${this.manoActualNumero}: Equipo ${ganadorManoEquipoId}`);
        } else if (fueParda) {
            console.log(`Mano ${this.manoActualNumero} fue parda.`);
        }


        this.manosJugadas.push({
            numeroMano: this.manoActualNumero,
            jugadas: [...this.cartasEnMesaManoActual],
            ganadorManoEquipoId: ganadorManoEquipoId,
            fueParda: fueParda
        });
        this.ronda._actualizarEstadoParaNotificar('mano_finalizada', { numeroMano: this.manoActualNumero, ganadorManoEquipoId, fueParda, jugadas: this.cartasEnMesaManoActual });


        if (this.verificarFinDeRonda()) {
            this.ronda._finalizarRondaLogica();
        } else {
            this.manoActualNumero++;
            this.iniciarNuevaMano(); // Prepara para la siguiente mano y setea el turno.
        }
    }

    verificarFinDeRonda() {
        // Lógica de _verificarFinDeRonda de RondaGame original, adaptada.
        // El ganador de la ronda se setea en this.ronda.ganadorRondaEquipoId
        if (this.manosJugadas.length >= 3) {
            this.determinarGanadorRondaPorManos();
            return true;
        }

        const conteoVictoriasPorEquipo = {};
        this.ronda.equipos.forEach(eq => conteoVictoriasPorEquipo[eq.id] = 0);

        for (const mano of this.manosJugadas) {
            if (mano.ganadorManoEquipoId && !mano.fueParda) {
                conteoVictoriasPorEquipo[mano.ganadorManoEquipoId]++;
                if (conteoVictoriasPorEquipo[mano.ganadorManoEquipoId] === 2) {
                    this.ronda.ganadorRondaEquipoId = mano.ganadorManoEquipoId;
                    return true;
                }
            }
        }
        
        if (this.manosJugadas.length === 2) {
            const mano1 = this.manosJugadas[0];
            const mano2 = this.manosJugadas[1];

            if (mano1.fueParda && mano2.ganadorManoEquipoId) {
                this.ronda.ganadorRondaEquipoId = mano2.ganadorManoEquipoId;
                return true;
            }
            if (mano1.ganadorManoEquipoId && mano2.fueParda) {
                this.ronda.ganadorRondaEquipoId = mano1.ganadorManoEquipoId;
                return true;
            }
             if (mano1.fueParda && mano2.fueParda) { // Dos pardas, se define en la tercera
                return false; 
            }
        }
        
        if (this.manosJugadas.length === 2 && !this.ronda.ganadorRondaEquipoId) return false;

        if (this.manosJugadas.length === 3) { // Si llegamos a 3 manos y no se resolvió antes
             this.determinarGanadorRondaPorManos();
             return true;
        }
        return false;
    }
    
    determinarGanadorRondaPorManos() {
        // Esta función se llama si se jugaron las 3 manos o si las reglas de parda llevan a este punto.
        const conteoVictoriasPorEquipo = {};
        this.ronda.equipos.forEach(eq => conteoVictoriasPorEquipo[eq.id] = 0);
        this.manosJugadas.forEach(m => {
            if(m.ganadorManoEquipoId) conteoVictoriasPorEquipo[m.ganadorManoEquipoId]++;
        });

        const equipo1Id = this.ronda.equipos[0].id;
        const equipo2Id = this.ronda.equipos[1].id; // Asumiendo 2 equipos

        if (conteoVictoriasPorEquipo[equipo1Id] > conteoVictoriasPorEquipo[equipo2Id]) {
            this.ronda.ganadorRondaEquipoId = equipo1Id;
        } else if (conteoVictoriasPorEquipo[equipo2Id] > conteoVictoriasPorEquipo[equipo1Id]) {
            this.ronda.ganadorRondaEquipoId = equipo2Id;
        } else { // Empate en manos ganadas (e.g., 1-1 y 1 parda, o 3 pardas)
            if (this.manosJugadas[0].ganadorManoEquipoId) { // Gana el que ganó la primera
                this.ronda.ganadorRondaEquipoId = this.manosJugadas[0].ganadorManoEquipoId;
            } else if (this.manosJugadas[0].fueParda && this.manosJugadas[1].ganadorManoEquipoId) { // 1ra parda, 2da ganada
                this.ronda.ganadorRondaEquipoId = this.manosJugadas[1].ganadorManoEquipoId;
            } else if (this.manosJugadas[0].fueParda && this.manosJugadas[1].fueParda && this.manosJugadas[2].ganadorManoEquipoId) { // 1ra y 2da parda, 3ra ganada
                this.ronda.ganadorRondaEquipoId = this.manosJugadas[2].ganadorManoEquipoId;
            }
            else { // Tres pardas, o 1ra parda, 2da parda, 3ra parda -> gana el mano de la ronda
                this.ronda.ganadorRondaEquipoId = this.ronda.jugadorManoRonda.equipoId;
            }
        }
    }


    getEstado() {
        return {
            cartasEnMesaManoActual: this.cartasEnMesaManoActual.map(j => ({ ...j, carta: { ...j.carta } })),
            manosJugadas: this.manosJugadas.map(m => ({...m, jugadas: m.jugadas.map(j => ({...j, carta: {...j.carta}}))})),
            manoActualNumero: this.manoActualNumero,
            jugadorTurnoActualId: this.jugadorTurnoActual ? this.jugadorTurnoActual.id : null,
        };
    }
}

module.exports = RondaTurnoHandler;