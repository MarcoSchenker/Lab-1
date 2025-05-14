const Mazo = require('./Mazo');
const RondaTurnoHandler = require('./RondaTurnoHandler');
const RondaEnvidoHandler = require('./RondaEnvidoHandler');
const RondaTrucoHandler = require('./RondaTrucoHandler');

class RondaGame {
    constructor(numeroRonda, jugadoresEnOrden, jugadorMano, equipos, notificarEstadoCallback, persistirAccionCallback) {
        this.numeroRonda = numeroRonda;
        this.jugadoresEnOrden = jugadoresEnOrden;
        this.jugadorManoRonda = jugadorMano;
        this.equipos = equipos;
        this.mazo = new Mazo();
        
        this.notificarEstado = notificarEstadoCallback;
        this.persistirAccion = persistirAccionCallback;

        // Handlers
        this.turnoHandler = new RondaTurnoHandler(this);
        this.envidoHandler = new RondaEnvidoHandler(this);
        this.trucoHandler = new RondaTrucoHandler(this);

        this.ganadorRondaEquipoId = null;
        this.puntosGanadosEnvido = 0;
        this.puntosGanadosTruco = 0;
        this.trucoPendientePorEnvidoPrimero = false; // Para la regla "Envido Primero"

        this._iniciarRonda();
    }

    _iniciarRonda() {
        console.log(`Iniciando Ronda ${this.numeroRonda}. Mano: ${this.jugadorManoRonda.nombreUsuario}`);
        this.turnoHandler.repartirCartas();
        this.turnoHandler.establecerPrimerTurno();
        this.envidoHandler.resetParaNuevaRonda();
        this.trucoHandler.resetParaNuevaRonda();
        this.ganadorRondaEquipoId = null;
        this.puntosGanadosEnvido = 0;
        this.puntosGanadosTruco = 0;
        this.trucoPendientePorEnvidoPrimero = false;

        this._actualizarEstadoParaNotificar('ronda_iniciada');
    }

    manejarJugarCarta(jugadorId, idUnicoCarta) {
        return this.turnoHandler.registrarJugada(jugadorId, idUnicoCarta);
    }

    manejarCanto(jugadorId, tipoCanto, detalleCanto) { // detalleCanto no se usa mucho aquí
        if (tipoCanto.includes('ENVIDO') || tipoCanto === 'FALTA_ENVIDO') {
            return this.envidoHandler.registrarCanto(jugadorId, tipoCanto);
        } else if (tipoCanto === 'TRUCO' || tipoCanto === 'RETRUCO' || tipoCanto === 'VALE_CUATRO') {
            return this.trucoHandler.registrarCanto(jugadorId, tipoCanto);
        }
        console.warn(`Canto desconocido: ${tipoCanto}`);
        return false;
    }

    manejarRespuestaCanto(jugadorId, respuesta, cantoRespondidoTipo, nuevoCantoSiMas) {
        // cantoRespondidoTipo y nuevoCantoSiMas pueden ser útiles para lógica más fina,
        // pero la respuesta misma (QUIERO, NO_QUIERO, o un nuevo canto) es clave.
        if (this.envidoHandler.estaPendienteDeRespuesta()) {
            return this.envidoHandler.registrarRespuesta(jugadorId, respuesta);
        } else if (this.trucoHandler.estaPendienteDeRespuesta()) {
            return this.trucoHandler.registrarRespuesta(jugadorId, respuesta);
        }
        // Si es una declaración de puntos del envido
        if (this.envidoHandler.estadoResolucion === 'querido_pendiente_puntos' && !isNaN(parseInt(respuesta))) {
            return this.envidoHandler.registrarPuntosDeclarados(jugadorId, parseInt(respuesta));
        }

        console.warn(`No hay canto pendiente de respuesta para el jugador ${jugadorId} o respuesta desconocida ${respuesta}`);
        return false;
    }
    
    manejarIrseAlMazo(jugadorId) {
        // Irse al mazo generalmente afecta al truco.
        return this.trucoHandler.registrarMazo(jugadorId);
    }

    _finalizarRondaLogica() {
        // Esta función es llamada por los handlers cuando la ronda realmente termina (por juego o por "no quiero" al truco, o mazo).
        // 1. Calcular puntos finales del envido (si no se hizo ya en el handler)
        if (this.envidoHandler.querido && this.envidoHandler.estadoResolucion === 'resuelto' && this.envidoHandler.ganadorEnvidoEquipoId) {
            // Si el envido fue querido y resuelto (puntos declarados), y tenemos un ganador.
            // El cálculo de puntos para Falta Envido es especial.
            let puntosFinalesEnvido = 0;
            const ultimoCantoEnvido = this.envidoHandler.cantos[this.envidoHandler.cantos.length -1];
            if (ultimoCantoEnvido.tipo === 'FALTA_ENVIDO') {
                const equipoGanador = this.equipos.find(e => e.id === this.envidoHandler.ganadorEnvidoEquipoId);
                const equipoPerdedor = this.equipos.find(e => e.id !== this.envidoHandler.ganadorEnvidoEquipoId);
                if (equipoGanador && equipoPerdedor) {
                    puntosFinalesEnvido = this.ronda.partida.puntosObjetivo - equipoPerdedor.puntosPartida;
                    if (puntosFinalesEnvido <= 0) puntosFinalesEnvido = 1; // Mínimo 1 punto
                }
            } else {
                puntosFinalesEnvido = this.envidoHandler.puntosEnJuego;
            }
            this.puntosGanadosEnvido = puntosFinalesEnvido;
            // Los puntos ya deberían haber sido sumados al equipo por el handler de envido al resolverse.
        } else if (!this.envidoHandler.querido && this.envidoHandler.estadoResolucion === 'resuelto' && this.envidoHandler.ganadorEnvidoEquipoId) {
            // Si no se quiso el envido, los puntos ya se calcularon y sumaron en el handler.
            this.puntosGanadosEnvido = this.envidoHandler.puntosEnJuego;
        }


        // 2. Puntos del truco ya están en this.puntosGanadosTruco (seteados por trucoHandler o turnoHandler)
        // this.puntosGanadosTruco es seteado por el trucoHandler al resolverse o por irse al mazo.
        // O por el turnoHandler si la ronda termina por manos jugadas sin truco cantado (vale 1).
        if (!this.trucoHandler.cantado && this.ganadorRondaEquipoId) { // Si la ronda terminó por manos y no hubo truco
            this.puntosGanadosTruco = 1;
        }
        
        // Asegurar que el ganador de la ronda esté definido si no fue por mazo/no quiero al truco
        if(!this.ganadorRondaEquipoId && this.turnoHandler.manosJugadas.length > 0) {
             this.turnoHandler.determinarGanadorRondaPorManos(); // Esto setea this.ganadorRondaEquipoId
        }


        console.log(`Ronda ${this.numeroRonda} finalizada. Ganador Equipo: ${this.ganadorRondaEquipoId}. Puntos Truco: ${this.puntosGanadosTruco}, Puntos Envido: ${this.puntosGanadosEnvido}`);
        this._actualizarEstadoParaNotificar('ronda_finalizada');
    }

    _actualizarEstadoParaNotificar(tipoEvento, detalleAdicional = {}) {
        const estadoActualRonda = this.obtenerEstadoRonda();
        if (this.notificarEstado) {
            this.notificarEstado(tipoEvento, { ...estadoActualRonda, ...detalleAdicional });
        }
    }

    obtenerEstadoRonda() {
        return {
            numeroRonda: this.numeroRonda,
            jugadorManoRondaId: this.jugadorManoRonda.id,
            ...this.turnoHandler.getEstado(),
            envidoState: this.envidoHandler.getEstado(),
            trucoState: this.trucoHandler.getEstado(),
            trucoPendientePorEnvidoPrimero: this.trucoPendientePorEnvidoPrimero,
            ganadorRondaEquipoId: this.ganadorRondaEquipoId,
            puntosGanadosEnvido: this.puntosGanadosEnvido,
            puntosGanadosTruco: this.puntosGanadosTruco,
        };
    }
}

module.exports = RondaGame;