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
        // Validar si hay un envido pendiente (pero permitir en primera mano para "envido va primero")
        if (this.ronda.envidoHandler.estaPendienteDeRespuesta() && 
            !this.ronda.trucoPendientePorEnvidoPrimero &&
            this.ronda.turnoHandler.manoActualNumero !== 1) {
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

        // ✅ PROBLEMA 3 CORREGIDO: Permitir cantar truco en cualquier mano cuando es el turno del jugador
        // No solo validar turno de carta, sino también permitir cuando debe responder o puede subir el truco
        const esSuTurnoDeJugarCarta = this.ronda.turnoHandler.jugadorTurnoActual && 
                                     this.ronda.turnoHandler.jugadorTurnoActual.id === jugadorId;
        
        const puedeSubirTruco = this.querido && 
                               this.cantadoPorEquipoId !== jugadorCantor.equipoId && 
                               this.nivelActual !== 'VALE_CUATRO';
        
        if (!esSuTurnoDeJugarCarta && !puedeSubirTruco) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'Solo puedes cantar truco cuando es tu turno o puedes subir la apuesta.' 
            });
            return false;
        }

        // Guardar quién tenía el turno de jugar carta en este momento.
        this.ronda.turnoHandler.guardarTurnoAntesCanto();

        // Validar si el jugador puede cantar este nivel de truco
        let esValido = false;
        let nuevosPuntos = 0;

        if (this.nivelActual === null) {
            // Primer canto de truco
            if (tipoCanto === 'TRUCO') { esValido = true; nuevosPuntos = 2; }
        } else if (this.nivelActual === 'TRUCO') {
            // Respuesta con recanto
            if (tipoCanto === 'RETRUCO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { 
                esValido = true; 
                nuevosPuntos = 3; 
            }
        } else if (this.nivelActual === 'RETRUCO') {
            // Respuesta con recanto final
            if (tipoCanto === 'VALE_CUATRO' && this.cantadoPorEquipoId !== jugadorCantor.equipoId) { 
                esValido = true; 
                nuevosPuntos = 4; 
            }
        }
        
        // Permitir recantos incluso si ya fue querido (esto es correcto según las reglas)
        // Un equipo puede hacer retruco después de haber aceptado el truco inicial
        
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
            tipo_accion: 'CANT_TRU', 
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
            equipoDebeResponderTrucoId: this.equipoDebeResponderTruco ? this.equipoDebeResponderTruco.id : null // ✅ Normalizado nombre campo
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
                tipo_accion: 'RESP_TRU', 
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
            this.ronda.turnoHandler.restaurarTurnoAntesCanto();
            
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
                tipo_accion: 'RESP_TRU', 
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
            // Guardamos el turno actual de RondaTurnoHandler, ya que este jugador está interrumpiendo para cantar.
            this.ronda.turnoHandler.guardarTurnoAntesCanto();
            
            // Procesar el recanto directamente sin validar turno (ya se validó que es el equipo correcto)
            return this._procesarRecanto(jugadorId, respuesta);
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
            jugadorTurnoAlMomentoDelCantoId: this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId,
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

        // Si el truco no fue cantado, el equipo contrario al que se fue suma 1 punto.
        // Si el truco fue cantado pero no querido, el equipo que cantó gana los puntos del "no quiero".
        // Si el truco fue querido, el equipo contrario al que se fue gana los puntos en juego del truco.
        
        let puntosPorMazo = 0;

        if (this.estadoResolucion === 'querido') {
            // Si el truco ya fue querido, el que se va al mazo pierde los puntos del truco querido
            puntosPorMazo = this.puntosEnJuego;
            this.ronda.ganadorRondaEquipoId = equipoGanador.id;
            this.ronda.puntosGanadosTruco = puntosPorMazo;
        } else if (this.estadoResolucion === 'cantado_pendiente_respuesta') {
            // El equipo que cantó gana los puntos que hubiera ganado por un "no quiero"
            if (this.nivelActual === 'TRUCO') puntosPorMazo = 1;
            else if (this.nivelActual === 'RETRUCO') puntosPorMazo = 2;
            else if (this.nivelActual === 'VALE_CUATRO') puntosPorMazo = 3;
            
            // El ganador es el equipo que cantó, NO el equipo contrario al que se fue al mazo
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

    /**
     * Procesa un recanto (RETRUCO o VALE_CUATRO) como respuesta
     * @param {string} jugadorId ID del jugador que hace el recanto
     * @param {string} tipoCanto Tipo: 'RETRUCO' o 'VALE_CUATRO'
     * @returns {boolean} true si el recanto fue registrado exitosamente
     */
    _procesarRecanto(jugadorId, tipoCanto) {
        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) return false;

        // Determinar nuevos puntos y validar
        let nuevosPuntos = 0;
        if (tipoCanto === 'RETRUCO' && this.nivelActual === 'TRUCO') {
            nuevosPuntos = 3;
        } else if (tipoCanto === 'VALE_CUATRO' && this.nivelActual === 'RETRUCO') {
            nuevosPuntos = 4;
        } else {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'Recanto no válido para el nivel actual de truco.' 
            });
            return false;
        }

        // Actualizar el estado del truco
        this.puntosEnJuego = nuevosPuntos;
        this.nivelActual = tipoCanto;
        this.cantadoPorJugadorId = jugadorId;
        this.cantadoPorEquipoId = jugadorCantor.equipoId;
        this.estadoResolucion = 'cantado_pendiente_respuesta';
        
        // Determinar qué equipo debe responder (el contrario al que hizo el recanto)
        this.equipoDebeResponderTruco = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);
        
        // Registrar la acción y notificar
        this.ronda.persistirAccion({ 
            tipo_accion: 'CANT_TRU', 
            usuario_id_accion: jugadorId, 
            detalle_accion: { tipo_canto: tipoCanto } 
        });
        
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', {
            jugadorId, 
            tipo_canto: tipoCanto, 
            esTruco: true, 
            estadoTruco: this.getEstado(),
            equipoDebeResponderTrucoId: this.equipoDebeResponderTruco ? this.equipoDebeResponderTruco.id : null
        });
        
        return true;
    }
}

module.exports = RondaTrucoHandler;