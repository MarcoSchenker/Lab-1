class RondaTrucoHandler {
    /**
     * @param {RondaGame} ronda Instancia de la ronda actual.
     */
    constructor(ronda) {
        this.ronda = ronda;
        this.cantado = false;
        this.querido = null; // true, false, null
        this.puntosEnJuego = 1; // Por defecto, la ronda vale 1 punto si no hay truco
        this.nivelActual = null; // 'TRUCO', 'RETRUCO', 'VALE_CUATRO'
        this.cantadoPorJugadorId = null;
        this.cantadoPorEquipoId = null;
        this.respondidoPorJugadorId = null;
        this.estadoResolucion = 'no_cantado'; // 'no_cantado', 'cantado_pendiente_respuesta', 'querido', 'resuelto_no_querido'
        this.equipoDebeResponderTruco = null;
    }

    resetParaNuevaRonda() {
        this.cantado = false;
        this.querido = null;
        this.puntosEnJuego = 1;
        this.nivelActual = null;
        this.cantadoPorJugadorId = null;
        this.cantadoPorEquipoId = null;
        this.respondidoPorJugadorId = null;
        this.estadoResolucion = 'no_cantado';
        this.equipoDebeResponderTruco = null;
    }
    
    estaPendienteDeRespuesta() {
        return this.estadoResolucion === 'cantado_pendiente_respuesta';
    }

    registrarCanto(jugadorId, tipoCanto) {
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta() && !this.ronda.trucoPendientePorEnvidoPrimero) {
             this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Debe responder al envido antes de cantar truco.' });
            return false;
        }
        // Validar si el jugador puede cantar este nivel de truco
        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) return false;

        let esValido = false;
        let nuevosPuntos = 0;

        if (this.nivelActual === null) {
            if (tipoCanto === 'TRUCO') { esValido = true; nuevosPuntos = 2; }
        } else if (this.nivelActual === 'TRUCO' && this.querido) {
            if (tipoCanto === 'RETRUCO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { esValido = true; nuevosPuntos = 3; }
        } else if (this.nivelActual === 'RETRUCO' && this.querido) {
            if (tipoCanto === 'VALE_CUATRO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { esValido = true; nuevosPuntos = 4; }
        }
        
        // No se puede subir el propio truco si no fue respondido "quiero" por el otro equipo.
        if (this.cantadoPorEquipoId === jugadorCantor.equipoId && this.estadoResolucion === 'cantado_pendiente_respuesta') {
             this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'El otro equipo debe responder antes de que puedas subir el truco.' });
            return false;
        }


        if (!esValido) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: `No puedes cantar ${tipoCanto} ahora.` });
            return false;
        }

        this.cantado = true;
        this.nivelActual = tipoCanto;
        this.puntosEnJuego = nuevosPuntos;
        this.cantadoPorJugadorId = jugadorId;
        this.cantadoPorEquipoId = jugadorCantor.equipoId;
        this.querido = null; // Resetear querido al subir apuesta
        this.estadoResolucion = 'cantado_pendiente_respuesta';
        this.equipoDebeResponderTruco = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);

        this.ronda.persistirAccion({ tipo_accion: 'CANTO_TRUCO', usuario_id_accion: jugadorId, detalle_accion: { tipo_canto: tipoCanto } });
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', { jugadorId, tipo_canto: tipoCanto, esTruco: true });
        this.ronda.turnoHandler.setTurnoA(this.equipoDebeResponderTruco.jugadores[0].id); // Turno al primer jugador del equipo respondedor
        return true;
    }

    registrarRespuesta(jugadorId, respuesta) {
        const jugadorRespondedor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorRespondedor || !this.equipoDebeResponderTruco || jugadorRespondedor.equipoId !== this.equipoDebeResponderTruco.id) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno de responder al truco.' });
            return false;
        }

        this.respondidoPorJugadorId = jugadorId;

        if (respuesta === 'QUIERO') {
            this.querido = true;
            this.estadoResolucion = 'querido';
            this.ronda.puntosGanadosTruco = this.puntosEnJuego; // Los puntos se asignarán al ganador de la ronda
            this.ronda.persistirAccion({ tipo_accion: 'RESPUESTA_TRUCO', usuario_id_accion: jugadorId, detalle_accion: { respuesta } });
            this.ronda._actualizarEstadoParaNotificar('respuesta_canto', { jugadorId, respuesta, esTruco: true });
            // El turno vuelve al jugador que debería jugar después del que cantó el truco,
            // o al siguiente del que acaba de decir "quiero" si el flujo de juego normal continúa.
            // Esta lógica es compleja. Por ahora, al que cantó.
            this.ronda.turnoHandler.setTurnoA(this.cantadoPorJugadorId);


        } else if (respuesta === 'NO_QUIERO') {
            this.querido = false;
            this.estadoResolucion = 'resuelto_no_querido';
            this.ronda.ganadorRondaEquipoId = this.cantadoPorEquipoId; // El que cantó y no le quisieron gana la ronda (y los puntos del nivel anterior)
            
            if (this.nivelActual === 'TRUCO') this.puntosEnJuego = 1;
            else if (this.nivelActual === 'RETRUCO') this.puntosEnJuego = 2; // Gana los puntos del TRUCO
            else if (this.nivelActual === 'VALE_CUATRO') this.puntosEnJuego = 3; // Gana los puntos del RETRUCO
            
            this.ronda.puntosGanadosTruco = this.puntosEnJuego;
            this.ronda.persistirAccion({ tipo_accion: 'RESPUESTA_TRUCO', usuario_id_accion: jugadorId, detalle_accion: { respuesta } });
            this.ronda._actualizarEstadoParaNotificar('respuesta_canto', { jugadorId, respuesta, esTruco: true });
            this.ronda._finalizarRondaLogica(); // El no quiero al truco finaliza la ronda.

        } else { // Podría ser un "RETRUCO" o "VALE_CUATRO" como respuesta (cantar más)
            return this.registrarCanto(jugadorId, respuesta);
        }
        this.equipoDebeResponderTruco = null;
        return true;
    }
    
    registrarMazo(jugadorId) {
        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugador) return false;

        this.ronda.ganadorRondaEquipoId = this.ronda.equipos.find(e => e.id !== jugador.equipoId)?.id;
        
        if (this.estadoResolucion === 'querido') { // Si el truco estaba querido
            this.puntosEnJuego = this.puntosEnJuego; // Ya tiene los puntos correctos
        } else if (this.estadoResolucion === 'cantado_pendiente_respuesta') { // Si estaba cantado y se van al mazo antes de responder
            if (this.nivelActual === 'TRUCO') this.puntosEnJuego = 1;
            else if (this.nivelActual === 'RETRUCO') this.puntosEnJuego = 2;
            else if (this.nivelActual === 'VALE_CUATRO') this.puntosEnJuego = 3;
        } else { // No había truco cantado o ya estaba resuelto (no debería pasar aquí)
            this.puntosEnJuego = 1;
        }
        this.ronda.puntosGanadosTruco = this.puntosEnJuego;
        this.ronda.persistirAccion({ tipo_accion: 'IRSE_AL_MAZO', usuario_id_accion: jugadorId, detalle_accion: { ronda: this.ronda.numeroRonda } });
        this.ronda._finalizarRondaLogica();
        return true;
    }


    getEstado() {
        return {
            cantado: this.cantado,
            querido: this.querido,
            puntosEnJuego: this.puntosEnJuego,
            nivelActual: this.nivelActual,
            cantadoPorJugadorId: this.cantadoPorJugadorId,
            cantadoPorEquipoId: this.cantadoPorEquipoId,
            estadoResolucion: this.estadoResolucion,
            equipoDebeResponderTrucoId: this.equipoDebeResponderTruco ? this.equipoDebeResponderTruco.id : null,
        };
    }
}

module.exports = RondaTrucoHandler;