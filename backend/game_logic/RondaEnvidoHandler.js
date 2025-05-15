// ... (VALORES_CANTO_ENVIDO constant remains the same)
const VALORES_CANTO_ENVIDO = {
    'ENVIDO': { querido: 2, noQuerido: 1 },
    'REAL_ENVIDO': { querido: 3, noQuerido: 1 },
    'FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 1 },
    'ENVIDO_ENVIDO': { querido: 4, noQuerido: 2 },
    'ENVIDO_REAL_ENVIDO': { querido: 5, noQuerido: 2 },
    'ENVIDO_ENVIDO_REAL_ENVIDO': { querido: 7, noQuerido: 4 },
    'ENVIDO_FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 2 },
    'REAL_ENVIDO_FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 3 },
    'ENVIDO_ENVIDO_FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 4 },
    'ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 5 },
    'ENVIDO_ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': { querido: 'FALTA', noQuerido: 7 },
};

class RondaEnvidoHandler {
    constructor(ronda) {
        this.ronda = ronda;
        this.partida = ronda.partida; 
        this.resetParaNuevaRonda();
    }

    resetParaNuevaRonda() {
        this.cantado = false;
        this.querido = null;
        this.puntosEnJuegoCalculados = 0;
        this.valorTipoCantoActual = null;
        this.cantosRealizados = [];
        this.ganadorEnvidoEquipoId = null;
        this.estadoResolucion = 'no_cantado';
        
        this.declaracionEnCurso = false;
        this.jugadorTurnoDeclararPuntosId = null;
        this.equipoConLaIniciativaId = null; 
        this.puntosDeclaradosPorJugador = {}; 
        this.maxPuntosDeclaradosInfo = { puntos: -1, jugadorId: null, equipoId: null };
        
        this.jugadoresQueHanDeclarado = new Set(); // Tracks jugadorId who have spoken in this envido declaration
        // Stores ordered list of players for each team, useful for finding next speaker.
        this.jugadoresOrdenadosPorEquipo = {}; 

        this.puedeCantarEnvidoGeneral = true;
        this.equipoRespondedorCanto = null;
    }
    
    // ... (_puedeJugadorCantarEnvido, _normalizarTipoCanto, registrarCanto, onPrimeraManoTerminada, estaPendienteDeRespuesta, _calcularPuntosFaltaEnvido - no changes from previous version)
    estaPendienteDeRespuesta() {
        return this.estadoResolucion === 'cantado_pendiente_respuesta';
    }

    onPrimeraManoTerminada() {
        this.puedeCantarEnvidoGeneral = false;
    }
    
    _puedeJugadorCantarEnvido(jugadorId, tipoCantoOriginal) {
        if (this.ronda.turnoHandler.manoActualNumero !== 1) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'El envido solo se puede cantar en la primera mano.' });
            return false;
        }
        if (this.ronda.turnoHandler.cartasEnMesaManoActual.length >= this.ronda.jugadoresEnOrden.length && this.ronda.turnoHandler.manoActualNumero === 1) {
             this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'La primera mano ya ha finalizado, no se puede cantar envido.' });
            return false;
        }
        if (!this.puedeCantarEnvidoGeneral || this.ronda.trucoHandler.querido) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No se puede cantar envido en este momento.' });
            return false;
        }
        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) return false;
        const es1v1 = this.ronda.jugadoresEnOrden.length === 2;
        if (tipoCantoOriginal === 'FALTA_ENVIDO') return true;        
        if (es1v1) return true;
        if (jugadorCantor.esPie) return true; 
        if (this.cantosRealizados.length === 0) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Solo el pie del equipo puede iniciar el canto de envido (no Falta Envido).' });
            return false;
        }
        const ultimoCanto = this.cantosRealizados[this.cantosRealizados.length - 1];
        if (ultimoCanto.equipoId !== jugadorCantor.equipoId) return true;
        const pieDeSuEquipoYaCanto = this.cantosRealizados.some(c => {
            if (c.equipoId === jugadorCantor.equipoId) {
                const jCanto = this.ronda.jugadoresEnOrden.find(j => j.id === c.jugadorId);
                return jCanto && jCanto.esPie;
            }
            return false;
        });
        if (!pieDeSuEquipoYaCanto) {
             this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Como no eres pie, solo puedes continuar el envido si el pie de tu equipo ya cantó.' });
            return false;
        }
        return true;
    }
    
    _normalizarTipoCanto(tipoCantoPropuesto) {
        if (!this.cantado) { 
            if (['ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO'].includes(tipoCantoPropuesto)) return tipoCantoPropuesto;
        } else { 
            const ultimoCantoNormalizado = this.valorTipoCantoActual;
            if (tipoCantoPropuesto === 'ENVIDO') {
                if (ultimoCantoNormalizado === 'ENVIDO') return 'ENVIDO_ENVIDO';
            } else if (tipoCantoPropuesto === 'REAL_ENVIDO') {
                if (ultimoCantoNormalizado === 'ENVIDO') return 'ENVIDO_REAL_ENVIDO';
                if (ultimoCantoNormalizado === 'ENVIDO_ENVIDO') return 'ENVIDO_ENVIDO_REAL_ENVIDO';
            } else if (tipoCantoPropuesto === 'FALTA_ENVIDO') {
                if (ultimoCantoNormalizado === 'ENVIDO') return 'ENVIDO_FALTA_ENVIDO';
                if (ultimoCantoNormalizado === 'REAL_ENVIDO') return 'REAL_ENVIDO_FALTA_ENVIDO';
                if (ultimoCantoNormalizado === 'ENVIDO_ENVIDO') return 'ENVIDO_ENVIDO_FALTA_ENVIDO';
                if (ultimoCantoNormalizado === 'ENVIDO_REAL_ENVIDO') return 'ENVIDO_REAL_ENVIDO_FALTA_ENVIDO';
                if (ultimoCantoNormalizado === 'ENVIDO_ENVIDO_REAL_ENVIDO') return 'ENVIDO_ENVIDO_REAL_ENVIDO_FALTA_ENVIDO';
                return 'FALTA_ENVIDO'; 
            }
        }
        return null;
    }

    registrarCanto(jugadorId, tipoCantoOriginal) {
        if (!this._puedeJugadorCantarEnvido(jugadorId, tipoCantoOriginal)) return false;
        if (this.ronda.trucoHandler.estaPendienteDeRespuesta()) { this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Debe responder al truco antes de cantar envido.' }); return false; }

        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) return false;

        const tipoNormalizado = this._normalizarTipoCanto(tipoCantoOriginal);
        if (!tipoNormalizado || !VALORES_CANTO_ENVIDO[tipoNormalizado]) { this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: `Canto de envido ${tipoCantoOriginal} no válido o fuera de secuencia.` }); return false; }
        
        if (this.cantosRealizados.length > 0 && this.cantosRealizados[this.cantosRealizados.length - 1].equipoId === jugadorCantor.equipoId) { this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No puedes subir tu propio envido sin respuesta del oponente.' }); return false; }

        this.cantado = true;
        this.valorTipoCantoActual = tipoNormalizado;
        const valores = VALORES_CANTO_ENVIDO[tipoNormalizado];

        this.cantosRealizados.push({ 
            tipoOriginal: tipoCantoOriginal, tipoNormalizado, jugadorId, equipoId: jugadorCantor.equipoId,
            valorSiSeQuiere: valores.querido, valorSiNoSeQuiere: valores.noQuerido 
        });

        this.estadoResolucion = 'cantado_pendiente_respuesta';
        this.equipoRespondedorCanto = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);
        
        if(this.ronda.trucoHandler.estadoResolucion === 'cantado_pendiente_respuesta') this.ronda.trucoPendientePorEnvidoPrimero = true;

        this.ronda.persistirAccion({ tipo_accion: 'CANTO_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { tipo_canto: tipoCantoOriginal, normalizado: tipoNormalizado } });
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', { jugadorId, tipo_canto: tipoCantoOriginal, esEnvido: true, estadoEnvido: this.getEstado() });
        
        this.ronda.turnoHandler.setTurnoA(this.equipoRespondedorCanto.jugadores[0].id); 
        return true;
    }
     _calcularPuntosFaltaEnvido() { 
        if (!this.ronda.partida) return 1;
        const puntosObjetivo = this.ronda.partida.puntosObjetivo;
        let puntosEquipoGanadorActual = 0;
        let puntosEquipoPerdedorActual = 0;
        const equipoGanadorDelEnvido = this.ronda.partida.equipos.find(e => e.id === this.ganadorEnvidoEquipoId);
        const equipoPerdedorDelEnvido = this.ronda.partida.equipos.find(e => e.id !== this.ganadorEnvidoEquipoId);
        if (equipoGanadorDelEnvido) puntosEquipoGanadorActual = equipoGanadorDelEnvido.puntosPartida;
        if (equipoPerdedorDelEnvido) puntosEquipoPerdedorActual = equipoPerdedorDelEnvido.puntosPartida;
        const equipoConMasPuntos = Math.max(puntosEquipoGanadorActual, puntosEquipoPerdedorActual);
        let puntosFalta = puntosObjetivo - equipoConMasPuntos;
        return Math.max(1, puntosFalta);
    }

    registrarRespuesta(jugadorId, respuesta) {
        const jugadorRespondedor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorRespondedor || !this.equipoRespondedorCanto || jugadorRespondedor.equipoId !== this.equipoRespondedorCanto.id) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno de responder al envido.' });
            return false;
        }

        if (respuesta === 'QUIERO') {
            this.querido = true;
            this.estadoResolucion = 'querido_pendiente_puntos';
            this.declaracionEnCurso = true;
            
            const jugadorManoRonda = this.ronda.jugadorManoRonda;
            this.jugadorTurnoDeclararPuntosId = jugadorManoRonda.id;
            this.equipoConLaIniciativaId = jugadorManoRonda.equipoId; 
            
            this.puntosDeclaradosPorJugador = {};
            this.maxPuntosDeclaradosInfo = { puntos: -1, jugadorId: null, equipoId: null };
            this.jugadoresQueHanDeclarado.clear();
            this.jugadoresOrdenadosPorEquipo = {};
            this.ronda.equipos.forEach(eq => {
                this.jugadoresOrdenadosPorEquipo[eq.id] = this.ronda.jugadoresEnOrden.filter(j => j.equipoId === eq.id);
            });
            
            this.ronda.persistirAccion({ tipo_accion: 'RESPUESTA_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { respuesta, canto: this.valorTipoCantoActual } });
            this.ronda._actualizarEstadoParaNotificar('envido_querido_declarar_puntos', { estadoEnvido: this.getEstado(), turnoDeclararId: this.jugadorTurnoDeclararPuntosId });
            this.ronda.turnoHandler.setTurnoA(this.jugadorTurnoDeclararPuntosId);

        } else if (respuesta === 'NO_QUIERO') {
            this.querido = false;
            this.estadoResolucion = 'resuelto';
            const ultimoCantoInfo = this.cantosRealizados[this.cantosRealizados.length - 1];
            this.ganadorEnvidoEquipoId = ultimoCantoInfo.equipoId; 
            this.puntosEnJuegoCalculados = ultimoCantoInfo.valorSiNoSeQuiere;
            this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
            this.ronda.persistirAccion({ tipo_accion: 'RESPUESTA_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { respuesta, canto: this.valorTipoCantoActual } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados });
            this.resolverDependenciaTrucoYRestaurarTurno();
        } else { 
            return this.registrarCanto(jugadorId, respuesta); 
        }
        this.equipoRespondedorCanto = null;
        return true;
    }
    
    registrarPuntosDeclarados(jugadorId, puntos, esPaso = false, esSonBuenas = false) {
        if (!this.declaracionEnCurso || this.jugadorTurnoDeclararPuntosId !== jugadorId) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno de declarar puntos del envido o el envido no está en ese estado.' });
            return false;
        }

        const jugadorDeclarante = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        const equipoDeclaranteId = jugadorDeclarante.equipoId;
        const equipoRivalId = this.ronda.equipos.find(e => e.id !== equipoDeclaranteId)?.id;

        this.puntosDeclaradosPorJugador[jugadorId] = { puntos: esPaso ? -1 : puntos, esPaso, esSonBuenas };
        this.jugadoresQueHanDeclarado.add(jugadorId); // Mark this player as having spoken
        let envidoResuelto = false;
        let proximoJugadorId = null;

        if (esSonBuenas) {
            this.ganadorEnvidoEquipoId = this.equipoConLaIniciativaId;
            if (!this.ganadorEnvidoEquipoId && this.maxPuntosDeclaradosInfo.puntos === -1) { // Should be set by mano
                this.ganadorEnvidoEquipoId = this.ronda.jugadorManoRonda.equipoId;
            }
            envidoResuelto = true;
        } else {
            let tomoLaIniciativa = false;
            if (!esPaso) {
                if (puntos > this.maxPuntosDeclaradosInfo.puntos) {
                    tomoLaIniciativa = true;
                } else if (puntos === this.maxPuntosDeclaradosInfo.puntos) {
                    const maxHolderIsMano = this.maxPuntosDeclaradosInfo.jugadorId === this.ronda.jugadorManoRonda.id;
                    const currentIsMano = jugadorId === this.ronda.jugadorManoRonda.id;
                    if (currentIsMano && (!this.maxPuntosDeclaradosInfo.jugadorId || !maxHolderIsMano)) {
                        tomoLaIniciativa = true;
                    }
                }
            }

            if (tomoLaIniciativa) {
                this.maxPuntosDeclaradosInfo = { puntos, jugadorId, equipoId: equipoDeclaranteId };
                this.equipoConLaIniciativaId = equipoDeclaranteId;

                // Turno cambia al equipo rival. Find first available player in rival team.
                const jugadoresDelEquipoRival = this.jugadoresOrdenadosPorEquipo[equipoRivalId] || [];
                const siguienteJugadorDelEquipoRival = jugadoresDelEquipoRival.find(j => !this.jugadoresQueHanDeclarado.has(j.id));
                
                if (siguienteJugadorDelEquipoRival) {
                    proximoJugadorId = siguienteJugadorDelEquipoRival.id;
                } else { // Equipo rival no tiene más jugadores disponibles para hablar
                    this.ganadorEnvidoEquipoId = this.equipoConLaIniciativaId; // Gana el que acaba de tomar la iniciativa
                    envidoResuelto = true;
                }
            } else { // No tomó la iniciativa (paso o puntos insuficientes)
                // Turno sigue en el mismo equipo (equipoDeclaranteId). Find next available player in this team.
                const jugadoresDelEquipoDeclarante = this.jugadoresOrdenadosPorEquipo[equipoDeclaranteId] || [];
                const indiceJugadorActualEnSuEquipo = jugadoresDelEquipoDeclarante.findIndex(j => j.id === jugadorId);
                
                let siguienteJugadorDelMismoEquipo = null;
                for (let i = indiceJugadorActualEnSuEquipo + 1; i < jugadoresDelEquipoDeclarante.length; i++) {
                    const candidato = jugadoresDelEquipoDeclarante[i];
                    if (!this.jugadoresQueHanDeclarado.has(candidato.id)) {
                        siguienteJugadorDelMismoEquipo = candidato;
                        break;
                    }
                }
                
                if (siguienteJugadorDelMismoEquipo) {
                    proximoJugadorId = siguienteJugadorDelMismoEquipo.id;
                } else { // No hay más jugadores disponibles en el equipo declarante
                    this.ganadorEnvidoEquipoId = this.equipoConLaIniciativaId; // Gana el equipo que tenía la iniciativa antes de este intento.
                    envidoResuelto = true;
                }
            }
        }

        if (envidoResuelto) {
            this.declaracionEnCurso = false;
            this.estadoResolucion = 'resuelto';
            const ultimoCantoNormalizado = this.valorTipoCantoActual;
            if (ultimoCantoNormalizado === 'FALTA_ENVIDO' || ultimoCantoNormalizado.includes('FALTA_ENVIDO')) {
                this.puntosEnJuegoCalculados = this._calcularPuntosFaltaEnvido();
            } else {
                this.puntosEnJuegoCalculados = VALORES_CANTO_ENVIDO[ultimoCantoNormalizado].querido;
            }
            this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
            
            this.ronda.persistirAccion({ tipo_accion: 'DECLARAR_PUNTOS_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas, ganadorDeterminado: this.ganadorEnvidoEquipoId } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados, puntosDeclarados: this.puntosDeclaradosPorJugador });
            this.resolverDependenciaTrucoYRestaurarTurno();
        } else if (proximoJugadorId) {
            this.jugadorTurnoDeclararPuntosId = proximoJugadorId;
            this.ronda.persistirAccion({ tipo_accion: 'DECLARAR_PUNTOS_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas } });
            this.ronda._actualizarEstadoParaNotificar('envido_puntos_declarados', { estadoEnvido: this.getEstado(), turnoDeclararId: this.jugadorTurnoDeclararPuntosId, puntosDeclaradosPorJugador: this.puntosDeclaradosPorJugador });
        } else {
            // Should not happen if logic is correct and envidoResuelto is false, implies no next player but not resolved.
            // For safety, resolve with current initiative holder.
            this.ganadorEnvidoEquipoId = this.equipoConLaIniciativaId;
            envidoResuelto = true; // Force resolution
             this.ronda.persistirAccion({ tipo_accion: 'DECLARAR_PUNTOS_ENVIDO', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas, ganadorDeterminado: this.ganadorEnvidoEquipoId, error: "Forced resolution" } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados, puntosDeclarados: this.puntosDeclaradosPorJugador });
            this.resolverDependenciaTrucoYRestaurarTurno();
        }
        return true;
    }

    resolverDependenciaTrucoYRestaurarTurno() {
        // Restaurar turno al jugador que estaba en turno antes del envido, o al ganador de envido si no hay truco pendiente
        if (this.ronda.trucoPendientePorEnvidoPrimero) {
            console.log("Hay un truco pendiente por Envido Primero que debe ser resuelto");
            // La notificación se maneja en RondaGame -> manejarRespuestaCanto
        } else {
            // Si no hay truco pendiente, restaurar el turno normal
            if (this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId) {
                this.ronda.turnoHandler.setTurnoA(this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId);
                this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId = null;
            } else {
                // Si no hay referencia a un turno anterior, establecer al ganador del envido
                // o al mano si no hay ganador determinado todavía
                if (this.ganadorEnvidoEquipoId) {
                    const jugadorGanadorPrimero = this.ronda.jugadoresEnOrden.find(
                        j => j.equipoId === this.ganadorEnvidoEquipoId
                    );
                    if (jugadorGanadorPrimero) this.ronda.turnoHandler.setTurnoA(jugadorGanadorPrimero.id);
                } else {
                    const manoJugador = this.ronda.jugadorManoRonda;
                    if (manoJugador) this.ronda.turnoHandler.setTurnoA(manoJugador.id);
                }
            }
        }
    }

    getEstado() {
        return {
            cantado: this.cantado,
            querido: this.querido,
            puntosEnJuegoCalculados: this.puntosEnJuegoCalculados,
            valorTipoCantoActual: this.valorTipoCantoActual,
            cantosRealizados: this.cantosRealizados,
            ganadorEnvidoEquipoId: this.ganadorEnvidoEquipoId,
            estadoResolucion: this.estadoResolucion,
            declaracionEnCurso: this.declaracionEnCurso,
            jugadorTurnoDeclararPuntosId: this.jugadorTurnoDeclararPuntosId,
            equipoConLaIniciativaId: this.equipoConLaIniciativaId,
            maxPuntosDeclaradosInfo: this.maxPuntosDeclaradosInfo,
            puntosDeclaradosPorJugador: this.puntosDeclaradosPorJugador,
            jugadoresQueHanDeclarado: Array.from(this.jugadoresQueHanDeclarado), // For client state if needed

            puedeCantarEnvidoGeneral: this.puedeCantarEnvidoGeneral,
            equipoRespondedorCantoId: this.equipoRespondedorCanto ? this.equipoRespondedorCanto.id : null
        };
    }
    /**
     * Registra cuando un jugador dice "Son Buenas" en respuesta al envido
     * @param {string} jugadorId ID del jugador que dice Son Buenas
     * @returns {boolean} true si se registró correctamente
     */
    registrarSonBuenas(jugadorId) {
        // Validar que el jugador puede declarar puntos ahora
        if (this.estadoResolucion !== 'querido_pendiente_puntos') {
            this.ronda.notificarEstado('error_accion_juego', {
                jugadorId,
                mensaje: 'No es momento de decir "Son Buenas" para el envido.'
            });
            return false;
        }

        // Verificar que sea el turno del jugador para declarar puntos
        const jugadorDeclarante = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorDeclarante || jugadorDeclarante.id !== this.jugadorTurnoDeclararPuntosId) {
            this.ronda.notificarEstado('error_accion_juego', {
                jugadorId,
                mensaje: 'No es tu turno para decir "Son Buenas".'
            });
            return false;
        }

        // Solo el segundo equipo en declarar puede decir "Son Buenas"
        if (!this.maxPuntosDeclaradosInfo.equipoId || this.maxPuntosDeclaradosInfo.equipoId === jugadorDeclarante.equipoId) {
            this.ronda.notificarEstado('error_accion_juego', {
                jugadorId,
                mensaje: 'El primer equipo debe declarar sus puntos, no puede decir "Son Buenas".'
            });
            return false;
        }

        // El jugador acepta que tiene menos puntos, el otro equipo gana
        this.ganadorEnvidoEquipoId = this.maxPuntosDeclaradosInfo.equipoId;
        
        // Marcar el envido como resuelto completamente
        this.estadoResolucion = 'resuelto';
        this.declaracionEnCurso = false;

        // Calcular puntos
        const ultimoCantoNormalizado = this.valorTipoCantoActual;
        if (ultimoCantoNormalizado === 'FALTA_ENVIDO' || ultimoCantoNormalizado.includes('FALTA_ENVIDO')) {
            this.puntosEnJuegoCalculados = this._calcularPuntosFaltaEnvido();
        } else {
            this.puntosEnJuegoCalculados = VALORES_CANTO_ENVIDO[ultimoCantoNormalizado].querido;
        }
        this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
        
        // Persistir la acción
        this.ronda.persistirAccion({
            tipo_accion: 'SON_BUENAS_ENVIDO',
            usuario_id_accion: jugadorId,
            detalle_accion: {
                equipoGanador: this.ganadorEnvidoEquipoId,
                puntos: this.puntosEnJuegoCalculados
            }
        });
        
        this.ronda._actualizarEstadoParaNotificar('envido_resuelto', {
            jugadorId,
            respuesta: 'SON_BUENAS_ENVIDO',
            puntosGanador: this.maxPuntosDeclaradosInfo.puntos,
            equipoGanadorId: this.ganadorEnvidoEquipoId,
            puntosGanados: this.puntosEnJuegoCalculados,
            dijoBuenasEquipoId: jugadorDeclarante.equipoId
        });
        
        console.log(`Envido resuelto con "Son Buenas". Equipo ${this.ganadorEnvidoEquipoId} gana ${this.puntosEnJuegoCalculados} puntos.`);
        
        // Verificar si hay truco pendiente por "Envido Primero"
        this.resolverDependenciaTrucoYRestaurarTurno();
        
        return true;
    }
}

module.exports = RondaEnvidoHandler;