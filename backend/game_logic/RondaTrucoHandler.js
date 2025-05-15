/**
 * Manejador de la lógica del Truco dentro de una ronda del juego.
 * Se encarga de controlar cantos, respuestas y estado del truco.
 */
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
        this.jugadorTurnoAlMomentoDelCantoId = null; // ID del jugador cuyo turno de JUGAR CARTA era cuando se cantó el truco
    }

    /**
     * Reinicia el estado del handler para una nueva ronda
     */
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
        this.jugadorTurnoAlMomentoDelCantoId = null;
    }
    
    /**
     * Verifica si hay un canto de truco pendiente de respuesta
     * @returns {boolean} true si hay un canto pendiente de respuesta
     */
    estaPendienteDeRespuesta() {
        return this.estadoResolucion === 'cantado_pendiente_respuesta';
    }
    
    /**
     * Registra un canto de truco, retruco o vale cuatro
     * @param {string} jugadorId ID del jugador que realiza el canto
     * @param {string} tipoCanto Tipo de canto: 'TRUCO', 'RETRUCO', 'VALE_CUATRO'
     * @returns {boolean} true si el canto fue registrado exitosamente
     */
    registrarCanto(jugadorId, tipoCanto) {
        // Validar si hay un envido pendiente
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta() && !this.ronda.trucoPendientePorEnvidoPrimero) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'Debe responder al envido antes de cantar truco.' 
            });
            return false;
        }
        
        // Validar si el jugador existe
        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Jugador no encontrado.' });
            return false;
        }

        // Validar que el jugador pueda cantar en este momento (es su turno de jugar carta)
        if (!this.ronda.turnoHandler.jugadorTurnoActual || this.ronda.turnoHandler.jugadorTurnoActual.id !== jugadorId) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'Solo puedes cantar truco cuando es tu turno de jugar una carta.' 
            });
            return false;
        }

        // Guardar quién tenía el turno de jugar carta en este momento.
        // this.ronda.turnoHandler.jugadorTurnoActual debería estar siempre definido si es el turno de alguien.
        if (this.ronda.turnoHandler.jugadorTurnoActual) {
            this.jugadorTurnoAlMomentoDelCantoId = this.ronda.turnoHandler.jugadorTurnoActual.id;
        } else {
            // Esto no debería ocurrir si la lógica de turnos es correcta.
            console.error("RondaTrucoHandler: No se pudo determinar jugadorTurnoAlMomentoDelCantoId porque turnoHandler.jugadorTurnoActual es null.");
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Error interno al determinar el turno para el truco.' });
            return false;
        }

        // Validar si el jugador puede cantar este nivel de truco
        let esValido = false;
        let nuevosPuntos = 0;

        if (this.nivelActual === null) {
            if (tipoCanto === 'TRUCO') { esValido = true; nuevosPuntos = 2; }
        } else if (this.nivelActual === 'TRUCO' && this.querido) {
            if (tipoCanto === 'RETRUCO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { esValido = true; nuevosPuntos = 3; }
        } else if (this.nivelActual === 'RETRUCO' && this.querido) {
            if (tipoCanto === 'VALE_CUATRO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { esValido = true; nuevosPuntos = 4; }
        }
        
        // No se puede subir el propio truco si el oponente aún no ha respondido
        if (this.cantadoPorEquipoId === jugadorCantor.equipoId && this.estadoResolucion === 'cantado_pendiente_respuesta') {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'El otro equipo debe responder antes de que puedas subir el truco.' 
            });
            return false;
        }
        
        if (!esValido) {
            let mensajeError = 'No puedes cantar este nivel de truco en este momento.';
            if (this.nivelActual === 'VALE_CUATRO' && this.querido) {
                mensajeError = 'Ya se alcanzó el nivel máximo de truco (Vale Cuatro).';
            } else if (this.cantadoPorEquipoId === jugadorCantor.equipoId && this.nivelActual !== null) { // No puede subir su propio truco si ya hay uno cantado por él y no querido
                mensajeError = 'No puedes subir tu propio truco, debe hacerlo el equipo contrario o esperar respuesta.';
            }
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: mensajeError });
            return false;
        }
        
        // Actualizar el estado del truco
        this.cantado = true;
        this.puntosEnJuego = nuevosPuntos;
        this.nivelActual = tipoCanto;
        this.cantadoPorJugadorId = jugadorId;
        this.cantadoPorEquipoId = jugadorCantor.equipoId;
        this.estadoResolucion = 'cantado_pendiente_respuesta';
        
        // Determinar qué equipo debe responder
        this.equipoDebeResponderTruco = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);
        
        // Registrar la acción y notificar
        this.ronda.persistirAccion({ 
            tipo_accion: 'CANTO_TRUCO', 
            usuario_id_accion: jugadorId, 
            detalle_accion: { tipo_canto: tipoCanto } 
        });
        
        // El turno para responder al truco lo tiene cualquier jugador del equipoDebeResponderTruco.
        // RondaGame o el cliente manejarán quién específicamente responde.
        // No se cambia el turno de RondaTurnoHandler aquí, solo se notifica.
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', { // Cambiado de 'canto' a 'canto_realizado' por consistencia con envido
            jugadorId, 
            tipo_canto: tipoCanto, 
            esTruco: true, 
            estadoTruco: this.getEstado(),
            equipoDebeResponderId: this.equipoDebeResponderTruco ? this.equipoDebeResponderTruco.id : null
        });
        
        return true;
    }
    
    /**
     * Registra una respuesta a un canto de truco
     * @param {string} jugadorId ID del jugador que responde
     * @param {string} respuesta Respuesta: 'QUIERO', 'NO_QUIERO', 'RETRUCO', 'VALE_CUATRO'
     * @returns {boolean} true si la respuesta fue registrada exitosamente
     */
    registrarRespuesta(jugadorId, respuesta) {
        const jugadorRespondedor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        
        // Validar que sea un jugador del equipo que debe responder
        if (!jugadorRespondedor || !this.equipoDebeResponderTruco || jugadorRespondedor.equipoId !== this.equipoDebeResponderTruco.id) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'No es tu turno o el equipo correcto para responder al truco.' 
            });
            return false;
        }

        this.respondidoPorJugadorId = jugadorId;

        // Manejar respuesta "QUIERO"
        if (respuesta === 'QUIERO') {
            this.querido = true;
            this.estadoResolucion = 'querido';
            this.ronda.puntosGanadosTruco = this.puntosEnJuego; 
            
            this.ronda.persistirAccion({ 
                tipo_accion: 'RESPUESTA_TRUCO', 
                usuario_id_accion: jugadorId, 
                detalle_accion: { respuesta } 
            });
            
            this.ronda._actualizarEstadoParaNotificar('respuesta_canto', { 
                jugadorId, 
                respuesta, 
                esTruco: true, 
                estadoTruco: this.getEstado() 
            });
            
            // El turno vuelve al jugador que estaba en turno cuando se cantó
            if (this.jugadorTurnoAlMomentoDelCantoId) {
                this.ronda.turnoHandler.setTurnoA(this.jugadorTurnoAlMomentoDelCantoId);
            } else {
                console.error("RondaTrucoHandler: jugadorTurnoAlMomentoDelCantoId es null después de un QUIERO. No se puede restaurar el turno correctamente.");
                // Considerar un fallback muy defensivo o finalizar la ronda con error si esto ocurre.
                // Por ahora, no se cambia el turno si no hay información.
            }
            
            return true;
        } 
        // Manejar respuesta "NO_QUIERO"
        else if (respuesta === 'NO_QUIERO') {
            this.querido = false;
            this.estadoResolucion = 'resuelto_no_querido';
            
            // Determinar puntos a otorgar (1 si es truco inicial, o el valor del nivel anterior)
            let puntosOtorgados = 1; // Por defecto si es el primer TRUCO
            if (this.nivelActual === 'TRUCO') puntosOtorgados = 1;
            else if (this.nivelActual === 'RETRUCO') puntosOtorgados = 2; // Gana los puntos del TRUCO querido
            else if (this.nivelActual === 'VALE_CUATRO') puntosOtorgados = 3; // Gana los puntos del RETRUCO querido
            
            const equipoGanadorPorNoQuerer = this.ronda.equipos.find(e => e.id === this.cantadoPorEquipoId);
            if (equipoGanadorPorNoQuerer) {
                // Los puntos se asignarán al final de la ronda o partida por RondaGame.
                // Aquí solo se registra quién ganó y cuántos puntos por el "no quiero".
                this.ronda.puntosGanadosTruco = puntosOtorgados;
                this.ronda.ganadorRondaEquipoId = equipoGanadorPorNoQuerer.id; // El "no quiero" define el ganador de la ronda (de los puntos del truco)
                 console.log(`Truco no querido. Equipo ${equipoGanadorPorNoQuerer.id} gana ${puntosOtorgados} puntos.`);
            }
            
            this.ronda.persistirAccion({ 
                tipo_accion: 'RESPUESTA_TRUCO', 
                usuario_id_accion: jugadorId, 
                detalle_accion: { respuesta } 
            });
            
            this.ronda._actualizarEstadoParaNotificar('respuesta_canto', { 
                jugadorId, 
                respuesta, 
                esTruco: true, 
                estadoTruco: this.getEstado(),
                equipoGanadorId: equipoGanadorPorNoQuerer ? equipoGanadorPorNoQuerer.id : null,
                puntosGanados: puntosOtorgados
            });
            
            this.ronda._finalizarRondaLogica(); // El "no quiero" finaliza la ronda.
            return true;
        } 
        // Manejar recantos (RETRUCO o VALE_CUATRO como respuesta)
        else if ((respuesta === 'RETRUCO' && this.nivelActual === 'TRUCO') || 
                 (respuesta === 'VALE_CUATRO' && this.nivelActual === 'RETRUCO')) {
            // El jugador que responde está subiendo la apuesta.
            // El turno para cantar ahora es de este jugador.
            // Guardamos el turno actual de RondaTurnoHandler, ya que este jugador está interrumpiendo para cantar.
            if (this.ronda.turnoHandler.jugadorTurnoActual) {
                 this.jugadorTurnoAlMomentoDelCantoId = this.ronda.turnoHandler.jugadorTurnoActual.id;
            } // Si no, se mantiene el anterior this.jugadorTurnoAlMomentoDelCantoId
            return this.registrarCanto(jugadorId, respuesta);
        } 
        else {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'Respuesta no válida para el nivel actual de truco.' 
            });
            return false;
        }
    }
    
    /**
     * Obtiene el estado actual del truco para notificaciones
     * @returns {Object} Estado del truco
     */
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
            jugadorTurnoAlMomentoDelCantoId: this.jugadorTurnoAlMomentoDelCantoId,
        };
    }
    
    /**
     * Verifica si el truco ha sido resuelto (querido o no querido)
     * @returns {boolean} true si el truco está resuelto
     */
    estaResuelto() {
        return this.estadoResolucion === 'querido' || this.estadoResolucion === 'resuelto_no_querido';
    }
    
    /**
     * Verifica si un jugador puede responder al truco actual
     * @param {string} jugadorId ID del jugador a verificar
     * @returns {boolean} true si el jugador puede responder
     */
    puedeResponderTruco(jugadorId) {
        if (!this.estaPendienteDeRespuesta()) return false;
        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        return jugador && this.equipoDebeResponderTruco && jugador.equipoId === this.equipoDebeResponderTruco.id;
    }
    
    /**
     * Verifica si un jugador puede cantar truco o subir el nivel
     * @param {string} jugadorId ID del jugador a verificar
     * @returns {boolean} true si el jugador puede cantar
     */
    puedeCantar(jugadorId) {
        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugador) return false;
        
        // No se puede cantar si hay envido pendiente
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta()) return false;
        
        // Se puede cantar truco si es el turno del jugador para jugar una carta.
        if (!this.ronda.turnoHandler.jugadorTurnoActual || this.ronda.turnoHandler.jugadorTurnoActual.id !== jugadorId) {
            return false;
        }
        
        // Verificar si puede cantar según el nivel actual
        if (this.nivelActual === null) {
            return true; 
        } else if (this.estadoResolucion === 'querido') {
            // Solo el equipo contrario al que cantó el nivel actual (y fue querido) puede subir.
            return this.cantadoPorEquipoId !== jugador.equipoId;
        }
        // Si está 'cantado_pendiente_respuesta', solo el equipo que debe responder puede responder (con quiero, no quiero, o un recanto).
        // Esta función `puedeCantar` es para iniciar un nuevo nivel de canto, no para responder.
        // La respuesta con recanto se maneja en `registrarRespuesta`.
        return false;
    }

    /**
     * Maneja cuando un jugador se va al mazo
     * @param {string} jugadorIdQueSeFue ID del jugador que se fue al mazo
     * @returns {boolean} true si se registró correctamente
     */
    registrarMazo(jugadorIdQueSeFue) {
        const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorIdQueSeFue);
        if (!jugador) return false;

        const equipoQueSeFue = jugador.equipoId;
        const equipoGanador = this.ronda.equipos.find(e => e.id !== equipoQueSeFue);

        if (!equipoGanador) {
            console.error("Error al registrar mazo: no se encontró equipo ganador.");
            return false;
        }

        // Si el truco no fue cantado, el equipo ganador suma 1 punto.
        // Si el truco fue cantado pero no querido, el equipo que cantó gana los puntos del "no quiero".
        // Si el truco fue querido, el equipo contrario gana los puntos en juego del truco.
        
        let puntosPorMazo = 0;

        if (this.estadoResolucion === 'querido') {
            puntosPorMazo = this.puntosEnJuego;
        } else if (this.estadoResolucion === 'cantado_pendiente_respuesta') {
            // El equipo que cantó (this.cantadoPorEquipoId) gana los puntos que hubiera ganado por un "no quiero".
            if (this.nivelActual === 'TRUCO') puntosPorMazo = 1;
            else if (this.nivelActual === 'RETRUCO') puntosPorMazo = 2;
            else if (this.nivelActual === 'VALE_CUATRO') puntosPorMazo = 3;
            // El ganador es el equipo que cantó, no el equipo contrario al que se fue al mazo.
            // Esto necesita que el equipo ganador sea el que cantó.
            const equipoQueCantoOriginalmente = this.ronda.equipos.find(e => e.id === this.cantadoPorEquipoId);
            if (equipoQueCantoOriginalmente && equipoQueCantoOriginalmente.id !== equipoQueSeFue) {
                 this.ronda.ganadorRondaEquipoId = equipoQueCantoOriginalmente.id;
                 this.ronda.puntosGanadosTruco = puntosPorMazo;
            } else { // El que se fue al mazo es del mismo equipo que cantó, o no hay canto.
                 this.ronda.ganadorRondaEquipoId = equipoGanador.id;
                 this.ronda.puntosGanadosTruco = 1; // Default si no hay canto o el que cantó se fue.
            }
        } else { // 'no_cantado' o 'resuelto_no_querido' (este último no debería ocurrir aquí)
            puntosPorMazo = 1;
            this.ronda.ganadorRondaEquipoId = equipoGanador.id;
            this.ronda.puntosGanadosTruco = puntosPorMazo;
        }
        
        this.estadoResolucion = 'resuelto_por_mazo';
        this.querido = false; // Se considera no querido en términos de juego continuado.

        console.log(`Jugador ${jugadorIdQueSeFue} (Equipo ${equipoQueSeFue}) se fue al mazo. Equipo ${this.ronda.ganadorRondaEquipoId} gana ${this.ronda.puntosGanadosTruco} puntos.`);

        this.ronda.persistirAccion({
            tipo_accion: 'IRSE_AL_MAZO',
            usuario_id_accion: jugadorIdQueSeFue,
            detalle_accion: { equipo_ganador_id: this.ronda.ganadorRondaEquipoId, puntos: this.ronda.puntosGanadosTruco }
        });
        this.ronda._actualizarEstadoParaNotificar('jugador_se_fue_al_mazo', {
            jugadorId: jugadorIdQueSeFue,
            equipoGanadorId: this.ronda.ganadorRondaEquipoId,
            puntosGanados: this.ronda.puntosGanadosTruco,
            estadoTruco: this.getEstado()
        });
        this.ronda._finalizarRondaLogica();
        return true;
    }
}

module.exports = RondaTrucoHandler;