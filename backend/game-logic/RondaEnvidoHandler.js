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
        this.nivelActual = null; // ✅ Renombrado de valorTipoCantoActual para consistencia
        this.cantadoPorJugadorId = null;
        this.cantadoPorEquipoId = null;
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
            const ultimoCantoNormalizado = this.nivelActual;
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

    /**
     * Calcula los puntos de envido según las reglas oficiales
     * @param {string} nivelFinal Nivel final del envido (ej: 'ENVIDO_REAL_ENVIDO')
     * @param {boolean} fueQuerido Si el envido fue querido o no
     * @returns {number} Puntos que vale el envido
     */
    _calcularPuntosEnvido(nivelFinal, fueQuerido) {
        console.log(`[ENVIDO] Calculando puntos para nivel: ${nivelFinal}, querido: ${fueQuerido}`);
        
        // Tabla de puntos según las reglas del truco
        const tablaPuntos = {
            // Si se quiere | Si no se quiere
            'ENVIDO': { querido: 2, noQuerido: 1 },
            'REAL_ENVIDO': { querido: 3, noQuerido: 1 },
            'FALTA_ENVIDO': { querido: 'calcular', noQuerido: 1 },
            'ENVIDO_ENVIDO': { querido: 4, noQuerido: 2 },
            'ENVIDO_REAL_ENVIDO': { querido: 5, noQuerido: 2 },
            'ENVIDO_FALTA_ENVIDO': { querido: 'calcular', noQuerido: 2 },
            'REAL_ENVIDO_FALTA_ENVIDO': { querido: 'calcular', noQuerido: 3 },
            'ENVIDO_ENVIDO_REAL_ENVIDO': { querido: 7, noQuerido: 4 },
            'ENVIDO_ENVIDO_FALTA_ENVIDO': { querido: 'calcular', noQuerido: 4 },
            'ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': { querido: 'calcular', noQuerido: 5 },
            'ENVIDO_ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': { querido: 'calcular', noQuerido: 7 }
        };

        const regla = tablaPuntos[nivelFinal];
        if (!regla) {
            console.warn(`[ENVIDO] Nivel no reconocido: ${nivelFinal}, usando 1 punto por defecto`);
            return 1;
        }

        console.log(`[ENVIDO] Regla encontrada para ${nivelFinal}:`, regla);

        if (fueQuerido) {
            if (regla.querido === 'calcular') {
                console.log(`[ENVIDO] Regla requiere cálculo, llamando a _calcularPuntosFaltaEnvido()`);
                const puntosCalculados = this._calcularPuntosFaltaEnvido();
                console.log(`[ENVIDO] Resultado del cálculo: ${puntosCalculados}`);
                return puntosCalculados;
            }
            console.log(`[ENVIDO] Retornando puntos fijos (querido): ${regla.querido}`);
            return regla.querido;
        } else {
            console.log(`[ENVIDO] Retornando puntos fijos (no querido): ${regla.noQuerido}`);
            return regla.noQuerido;
        }
    }

    registrarCanto(jugadorId, tipoCantoOriginal) {
        if (!this._puedeJugadorCantarEnvido(jugadorId, tipoCantoOriginal)) return false;
        
        // ✅ CORRECCIÓN: Permitir envido cuando hay "envido va primero" activo
        if (this.ronda.trucoHandler.estaPendienteDeRespuesta() && !this.ronda.trucoPendientePorEnvidoPrimero) { 
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Debe responder al truco antes de cantar envido.' }); 
            return false; 
        }

        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) return false;

        const tipoNormalizado = this._normalizarTipoCanto(tipoCantoOriginal);
        if (!tipoNormalizado || !VALORES_CANTO_ENVIDO[tipoNormalizado]) { this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: `Canto de envido ${tipoCantoOriginal} no válido o fuera de secuencia.` }); return false; }
        
        // Solo impedir el recanto si ya ha habido una respuesta del equipo contrario
        // En caso contrario, permitir el encadenamiento de cantos del mismo equipo
        if (this.cantosRealizados.length > 0) {
            const ultimoCanto = this.cantosRealizados[this.cantosRealizados.length - 1];
            
            // Si es el mismo equipo, solo permitir si no ha habido respuesta aún
            if (ultimoCanto.equipoId === jugadorCantor.equipoId) {
                // Verificar si hubo alguna respuesta entre medias
                const hubRespuestaIntermedia = this.estadoResolucion === 'querido_pendiente_puntos' || 
                                              this.estadoResolucion === 'resuelto' ||
                                              this.querido !== null;
                
                if (hubRespuestaIntermedia) {
                    this.ronda.notificarEstado('error_accion_juego', { 
                        jugadorId, 
                        mensaje: 'No puedes subir tu propio envido después de una respuesta del oponente.' 
                    }); 
                    return false;
                }
                // Si no hubo respuesta, permitir el encadenamiento (Envido → Envido, etc.)
            }
        }

        this.cantado = true;
        this.nivelActual = tipoNormalizado;
        this.cantadoPorJugadorId = jugadorId;
        this.cantadoPorEquipoId = jugadorCantor.equipoId;
        const valores = VALORES_CANTO_ENVIDO[tipoNormalizado];

        this.cantosRealizados.push({ 
            tipoOriginal: tipoCantoOriginal, tipoNormalizado, jugadorId, equipoId: jugadorCantor.equipoId,
            valorSiSeQuiere: valores.querido, valorSiNoSeQuiere: valores.noQuerido 
        });

        this.estadoResolucion = 'cantado_pendiente_respuesta';
        this.equipoRespondedorCanto = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);
        
        // ✅ CORRECCIÓN: Solo guardar el turno si es el primer canto de envido en la secuencia
        if (this.cantosRealizados.length === 1) {
            // Es el primer canto de envido, guardar el turno original
            this.ronda.turnoHandler.guardarTurnoAntesCanto();
            console.log(`[ENVIDO] Primer canto de envido - turno guardado: ${this.ronda.turnoHandler.jugadorTurnoActual?.id}`);
        } else {
            console.log(`[ENVIDO] Canto encadenado - manteniendo turno guardado original: ${this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
        }
        
        if(this.ronda.trucoHandler.estadoResolucion === 'cantado_pendiente_respuesta') this.ronda.trucoPendientePorEnvidoPrimero = true;

        this.ronda.persistirAccion({ tipo_accion: 'CANTO_ENV', usuario_id_accion: jugadorId, detalle_accion: { tipo_canto: tipoCantoOriginal, normalizado: tipoNormalizado } });
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', { jugadorId, tipo_canto: tipoCantoOriginal, esEnvido: true, estadoEnvido: this.getEstado() });
        
        this.ronda.turnoHandler.setTurnoA(this.equipoRespondedorCanto.jugadores[0].id); 
        return true;
    }
    _calcularPuntosFaltaEnvido() { 
        if (!this.partida) {
            console.log(`[FALTA_ENVIDO] No hay partida disponible, retornando 1`);
            return 1;
        }
        
        const puntosVictoria = this.partida.puntosVictoria;
        console.log(`[FALTA_ENVIDO] Puntos para victoria: ${puntosVictoria}`);
        
        // ✅ CORRECCIÓN: Según las reglas, el falta envido se calcula basado en el equipo CON MÁS PUNTOS
        // "En el falta envido los puntos se cuentan como la diferencia de lo que le falta al equipo que tiene mas puntos para llegar al limite"
        const equipos = this.partida.equipos;
        if (!equipos || equipos.length === 0) {
            console.log(`[FALTA_ENVIDO] No hay equipos disponibles, retornando 1`);
            return 1;
        }
        
        console.log(`[FALTA_ENVIDO] Equipos disponibles:`, equipos.map(e => `${e.nombre} (${e.puntosPartida} pts)`));
        
        // Encontrar el equipo con más puntos
        const equipoConMasPuntos = equipos.reduce((equipoMax, equipo) => {
            return equipo.puntosPartida > equipoMax.puntosPartida ? equipo : equipoMax;
        });
        
        const puntosEquipoConMasPuntos = equipoConMasPuntos.puntosPartida;
        const puntosFalta = puntosVictoria - puntosEquipoConMasPuntos;
        
        console.log(`[FALTA_ENVIDO] Equipo con más puntos: ${equipoConMasPuntos.nombre} (${puntosEquipoConMasPuntos} puntos)`);
        console.log(`[FALTA_ENVIDO] Puntos que faltan: ${puntosVictoria} - ${puntosEquipoConMasPuntos} = ${puntosFalta}`);
        console.log(`[FALTA_ENVIDO] Retornando: ${Math.max(1, puntosFalta)}`);
        
        return Math.max(1, puntosFalta);
    }

    // ✅ NUEVO: Verificar victoria inmediata después de ganar envido
    _verificarVictoriaInmediata() {
        if (!this.partida || !this.ganadorEnvidoEquipoId || !this.puntosEnJuegoCalculados) return false;
        
        // Si la partida ya terminó, no verificar de nuevo
        if (this.partida.estadoPartida === 'finalizada') {
            console.log("[ENVIDO_VICTORIA] Partida ya finalizada - no verificar victoria");
            return true;
        }
        
        // Encontrar el equipo ganador del envido
        const equipoGanadorEnvido = this.partida.equipos.find(e => e.id === this.ganadorEnvidoEquipoId);
        if (!equipoGanadorEnvido) return false;
        
        // Sumar los puntos temporalmente para verificar si alcanza la victoria
        const puntosActuales = equipoGanadorEnvido.puntosPartida;
        const puntosConEnvido = puntosActuales + this.puntosEnJuegoCalculados;
        
        console.log(`[ENVIDO_VICTORIA] ${equipoGanadorEnvido.nombre}: ${puntosActuales} + ${this.puntosEnJuegoCalculados} = ${puntosConEnvido} (Victoria: ${this.partida.puntosVictoria})`);
        
        // Si alcanza los puntos de victoria, terminar la partida inmediatamente
        if (puntosConEnvido >= this.partida.puntosVictoria) {
            console.log(`[ENVIDO_VICTORIA] ¡Partida terminada! ${equipoGanadorEnvido.nombre} ganó con envido`);
            
            // Sumar los puntos inmediatamente
            equipoGanadorEnvido.sumarPuntos(this.puntosEnJuegoCalculados);
            
            // Marcar que los puntos ya fueron sumados para evitar doble suma
            this._puntosYaSumados = true;
            
            // Finalizar la partida
            this.partida.estadoPartida = 'finalizada';
            this.partida._notificarEstadoGlobalActualizado('partida_finalizada', { 
                ganadorPartidaId: equipoGanadorEnvido.id,
                razon: 'victoria_por_envido'
            });
            this.partida.persistirEstadoPartida();
            
            if (this.partida.finalizarPartidaCallback) {
                this.partida.finalizarPartidaCallback(this.partida.codigoSala, equipoGanadorEnvido.id);
            }
            
            return true; // Indica que la partida terminó
        }
        
        return false; // La partida continúa
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
            
            this.ronda.persistirAccion({ tipo_accion: 'RESP_ENV', usuario_id_accion: jugadorId, detalle_accion: { respuesta, canto: this.nivelActual } });
            this.ronda._actualizarEstadoParaNotificar('envido_querido_declarar_puntos', { estadoEnvido: this.getEstado(), turnoDeclararId: this.jugadorTurnoDeclararPuntosId });
            this.ronda.turnoHandler.setTurnoA(this.jugadorTurnoDeclararPuntosId);

        } else if (respuesta === 'NO_QUIERO') {
            this.querido = false;
            this.estadoResolucion = 'resuelto';
            const ultimoCantoInfo = this.cantosRealizados[this.cantosRealizados.length - 1];
            this.ganadorEnvidoEquipoId = ultimoCantoInfo.equipoId; 
            
            // Usar la nueva función de cálculo de puntos
            this.puntosEnJuegoCalculados = this._calcularPuntosEnvido(this.nivelActual, false);
            this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
            
            // ✅ NUEVO: Verificar victoria inmediata
            const partidaTerminada = this._verificarVictoriaInmediata();
            if (partidaTerminada) {
                // La partida terminó, no continuar con la ronda
                console.log("[ENVIDO] Partida terminada por victoria inmediata - no restaurar turno");
                return true;
            }
            
            this.ronda.persistirAccion({ tipo_accion: 'RESP_ENV', usuario_id_accion: jugadorId, detalle_accion: { respuesta, canto: this.nivelActual } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados });
            
            // Solo restaurar turno si la partida no terminó
            this.resolverDependenciaTrucoYRestaurarTurno();
        } else { 
            // Es un canto encadenado (ENVIDO, REAL_ENVIDO, FALTA_ENVIDO)
            return this.registrarCantoEncadenado(jugadorId, respuesta); 
        }
        this.equipoRespondedorCanto = null;
        return true;
    }
    
    registrarPuntosDeclarados(jugadorId, puntos, esPaso = false, esSonBuenas = false) {
        if (!this.declaracionEnCurso || this.jugadorTurnoDeclararPuntosId !== jugadorId) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'No es tu turno de declarar puntos del envido o el envido no está en ese estado.' });
            return false;
        }

        // PREVENIR MÚLTIPLES DECLARACIONES: Verificar si el jugador ya declaró puntos
        if (this.jugadoresQueHanDeclarado.has(jugadorId)) {
            this.ronda.notificarEstado('error_accion_juego', { jugadorId, mensaje: 'Ya has declarado tus puntos de envido en esta ronda.' });
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
            
            // Usar la nueva función de cálculo de puntos
            this.puntosEnJuegoCalculados = this._calcularPuntosEnvido(this.nivelActual, true);
            this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
            
            // ✅ NUEVO: Verificar victoria inmediata
            const partidaTerminada = this._verificarVictoriaInmediata();
            if (partidaTerminada) {
                // La partida terminó, no continuar con la ronda
                console.log("[ENVIDO] Partida terminada por victoria inmediata en declaración - no restaurar turno");
                return true;
            }
            
            this.ronda.persistirAccion({ tipo_accion: 'DECL_ENV', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas, ganadorDeterminado: this.ganadorEnvidoEquipoId } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados, puntosDeclarados: this.puntosDeclaradosPorJugador });
            
            // Solo restaurar turno si la partida no terminó
            this.resolverDependenciaTrucoYRestaurarTurno();
        } else if (proximoJugadorId) {
            this.jugadorTurnoDeclararPuntosId = proximoJugadorId;
            this.ronda.persistirAccion({ tipo_accion: 'DECL_ENV', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas } });
            this.ronda._actualizarEstadoParaNotificar('envido_puntos_declarados', { estadoEnvido: this.getEstado(), turnoDeclararId: this.jugadorTurnoDeclararPuntosId, puntosDeclaradosPorJugador: this.puntosDeclaradosPorJugador });
        } else {
            // Should not happen if logic is correct and envidoResuelto is false, implies no next player but not resolved.
            // For safety, resolve with current initiative holder.
            this.ganadorEnvidoEquipoId = this.equipoConLaIniciativaId;
            envidoResuelto = true; // Force resolution
             this.ronda.persistirAccion({ tipo_accion: 'DECL_ENV', usuario_id_accion: jugadorId, detalle_accion: { puntos, esPaso, esSonBuenas, ganadorDeterminado: this.ganadorEnvidoEquipoId, error: "Forced resolution" } });
            this.ronda._actualizarEstadoParaNotificar('envido_resuelto', { estadoEnvido: this.getEstado(), ganadorEquipoId: this.ganadorEnvidoEquipoId, puntos: this.puntosEnJuegoCalculados, puntosDeclarados: this.puntosDeclaradosPorJugador });
            this.resolverDependenciaTrucoYRestaurarTurno();
        }
        return true;
    }

    registrarCantoEncadenado(jugadorId, tipoCantoOriginal) {
        console.log(`[ENVIDO] Registrando canto encadenado: ${tipoCantoOriginal} por jugador ${jugadorId}`);
        
        // Verificar que el jugador puede responder (debe ser del equipo contrario al último que cantó)
        const jugadorCantor = this.ronda.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugadorCantor) {
            console.error(`[ENVIDO] Jugador ${jugadorId} no encontrado`);
            return false;
        }
        
        // Verificar que sea del equipo respondedor
        if (!this.equipoRespondedorCanto || jugadorCantor.equipoId !== this.equipoRespondedorCanto.id) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'No es tu turno de responder al envido.' 
            });
            return false;
        }
        
        // Normalizar el tipo de canto encadenado
        const tipoNormalizado = this._normalizarTipoCanto(tipoCantoOriginal);
        if (!tipoNormalizado || !VALORES_CANTO_ENVIDO[tipoNormalizado]) {
            this.ronda.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: `Canto de envido ${tipoCantoOriginal} no válido o fuera de secuencia.` 
            });
            return false;
        }
        
        console.log(`[ENVIDO] Canto normalizado: ${tipoNormalizado}`);
        
        // Actualizar el estado del envido
        this.nivelActual = tipoNormalizado;
        this.cantadoPorJugadorId = jugadorId;
        this.cantadoPorEquipoId = jugadorCantor.equipoId;
        const valores = VALORES_CANTO_ENVIDO[tipoNormalizado];
        
        // Agregar el nuevo canto a la cadena
        this.cantosRealizados.push({ 
            tipoOriginal: tipoCantoOriginal, 
            tipoNormalizado, 
            jugadorId, 
            equipoId: jugadorCantor.equipoId,
            valorSiSeQuiere: valores.querido, 
            valorSiNoSeQuiere: valores.noQuerido 
        });
        
        // El equipo respondedor ahora es el equipo contrario
        this.equipoRespondedorCanto = this.ronda.equipos.find(e => e.id !== jugadorCantor.equipoId);
        this.estadoResolucion = 'cantado_pendiente_respuesta';
        
        console.log(`[ENVIDO] Nuevo equipo respondedor: ${this.equipoRespondedorCanto.id}`);
        
        // Persistir la acción
        this.ronda.persistirAccion({ 
            tipo_accion: 'CANTO_ENVIDO_ENCADENADO', 
            usuario_id_accion: jugadorId, 
            detalle_accion: { 
                tipo_canto: tipoCantoOriginal, 
                normalizado: tipoNormalizado,
                es_encadenado: true,
                secuencia: this.cantosRealizados.map(c => c.tipoNormalizado)
            } 
        });
        
        // Notificar el nuevo canto
        this.ronda._actualizarEstadoParaNotificar('canto_realizado', { 
            jugadorId, 
            tipo_canto: tipoCantoOriginal, 
            esEnvido: true, 
            esCantoEncadenado: true,
            estadoEnvido: this.getEstado() 
        });
        
        // Cambiar turno al primer jugador del equipo respondedor
        const primerJugadorRespondedor = this.equipoRespondedorCanto.jugadores[0];
        if (primerJugadorRespondedor) {
            this.ronda.turnoHandler.setTurnoA(primerJugadorRespondedor.id);
        }
        
        console.log(`[ENVIDO] Canto encadenado registrado exitosamente`);
        return true;
    }

    resolverDependenciaTrucoYRestaurarTurno() {
        // ✅ NUEVO: Si la partida ya terminó, no restaurar turno
        if (this.partida.estadoPartida === 'finalizada') {
            console.log("[ENVIDO] Partida ya finalizada - no restaurar turno");
            return;
        }
        
        console.log("[ENVIDO] Resolviendo dependencia de truco y restaurando turno");
        console.log(`[ENVIDO] Estado actual - trucoPendientePorEnvidoPrimero: ${this.ronda.trucoPendientePorEnvidoPrimero}`);
        console.log(`[ENVIDO] Estado actual - jugadorTurnoAlMomentoDelCanto: ${this.ronda.turnoHandler.jugadorTurnoAlMomentoDelCantoId}`);
        console.log(`[ENVIDO] Estado actual - jugadorTurnoActual: ${this.ronda.turnoHandler.jugadorTurnoActual?.id}`);
        
        if (this.ronda.trucoPendientePorEnvidoPrimero) {
            console.log("[ENVIDO] Hay un truco pendiente por Envido Primero");
            // Cuando hay truco pendiente por "envido va primero", el turno debe ir al equipo que debe responder al truco
            const equipoQueDebeResponderTruco = this.ronda.trucoHandler.equipoDebeResponderTruco;
            if (equipoQueDebeResponderTruco && equipoQueDebeResponderTruco.jugadores.length > 0) {
                const jugadorRespondeTruco = equipoQueDebeResponderTruco.jugadores[0];
                this.ronda.turnoHandler.setTurnoA(jugadorRespondeTruco.id);
                console.log(`[ENVIDO] Turno asignado a ${jugadorRespondeTruco.nombreUsuario} para responder truco pendiente`);
            } else {
                console.warn("[ENVIDO] No se encontró equipo que debe responder al truco");
                // Fallback: restaurar turno guardado
                this.ronda.turnoHandler.restaurarTurnoAntesCanto();
            }
        } else {
            // Si no hay truco pendiente, restaurar el turno del jugador que lo tenía cuando se cantó el primer envido
            console.log("[ENVIDO] No hay truco pendiente, restaurando turno de juego normal");
            
            // ✅ CORRECCIÓN PRINCIPAL: Restaurar usando el método dedicado
            if (this.ronda.turnoHandler.restaurarTurnoAntesCanto()) {
                console.log("[ENVIDO] Turno restaurado exitosamente al jugador original");
            } else {
                // Si no hay turno guardado, determinar turno basado en la lógica de manos
                console.log("[ENVIDO] No hay turno guardado, determinando turno basado en mano actual");
                const manoActual = this.ronda.turnoHandler.manoActualNumero;
                
                if (manoActual === 1) {
                    // Primera mano: determinar quién debería tener el turno
                    const cartasJugadas = this.ronda.turnoHandler.cartasEnMesaManoActual.length;
                    const totalJugadores = this.ronda.jugadoresEnOrden.length;
                    
                    if (cartasJugadas === 0) {
                        // No se han jugado cartas, empieza el que está a la derecha del mano
                        const indiceMano = this.ronda.jugadoresEnOrden.findIndex(j => j.id === this.ronda.jugadorManoRonda.id);
                        const indiceSiguiente = (indiceMano + 1) % this.ronda.jugadoresEnOrden.length;
                        const jugadorInicia = this.ronda.jugadoresEnOrden[indiceSiguiente];
                        this.ronda.turnoHandler.setTurnoA(jugadorInicia.id);
                        console.log(`[ENVIDO] Primera mano sin cartas: turno a ${jugadorInicia.nombreUsuario} (siguiente al mano)`);
                    } else {
                        // Ya se jugaron cartas, continuar el orden desde la última carta jugada
                        const ultimaCartaJugada = this.ronda.turnoHandler.cartasEnMesaManoActual[cartasJugadas - 1];
                        const indiceUltimo = this.ronda.jugadoresEnOrden.findIndex(j => j.id === ultimaCartaJugada.jugadorId);
                        const indiceSiguiente = (indiceUltimo + 1) % totalJugadores;
                        const siguienteJugador = this.ronda.jugadoresEnOrden[indiceSiguiente];
                        this.ronda.turnoHandler.setTurnoA(siguienteJugador.id);
                        console.log(`[ENVIDO] Primera mano con ${cartasJugadas} cartas: turno a ${siguienteJugador.nombreUsuario} (siguiente al último)`);
                    }
                } else {
                    // Segunda o tercera mano: empieza el ganador de la mano anterior
                    const manoAnterior = this.ronda.turnoHandler.manosJugadas[manoActual - 2];
                    if (manoAnterior && manoAnterior.ganadorManoJugadorId) {
                        this.ronda.turnoHandler.setTurnoA(manoAnterior.ganadorManoJugadorId);
                        console.log(`[ENVIDO] Mano ${manoActual}: turno a ganador de mano anterior (${manoAnterior.ganadorManoJugadorId})`);
                    } else {
                        // Fallback: el mano
                        this.ronda.turnoHandler.setTurnoA(this.ronda.jugadorManoRonda.id);
                        console.log(`[ENVIDO] Fallback: turno al mano (${this.ronda.jugadorManoRonda.id})`);
                    }
                }
            }
        }
    }

    getEstado() {
        // Información básica del estado
        const estado = {
            cantado: this.cantado,
            querido: this.querido,
            puntosEnJuegoCalculados: this.puntosEnJuegoCalculados,
            nivelActual: this.nivelActual, // ✅ Campo ahora consistente interno/externo
            cantadoPorJugadorId: this.cantadoPorJugadorId,
            cantadoPorEquipoId: this.cantadoPorEquipoId,
            cantosRealizados: this.cantosRealizados,
            ganadorEnvidoEquipoId: this.ganadorEnvidoEquipoId,
            estadoResolucion: this.estadoResolucion,
            declaracionEnCurso: this.declaracionEnCurso,
            jugadorTurnoDeclararPuntosId: this.jugadorTurnoDeclararPuntosId,
            equipoConLaIniciativaId: this.equipoConLaIniciativaId,
            maxPuntosDeclaradosInfo: this.maxPuntosDeclaradosInfo,
            puntosDeclaradosPorJugador: this.puntosDeclaradosPorJugador,
            jugadoresQueHanDeclarado: Array.from(this.jugadoresQueHanDeclarado),
            puedeCantarEnvidoGeneral: this.puedeCantarEnvidoGeneral,
            equipoRespondedorCantoId: this.equipoRespondedorCanto ? this.equipoRespondedorCanto.id : null
        };

        // Información adicional para el frontend
        // Ayuda a determinar si se puede decir "Son Buenas"
        estado.puedeDeclararSonBuenas = this.estadoResolucion === 'querido_pendiente_puntos' && 
                                        this.maxPuntosDeclaradosInfo.puntos > -1;
        
        // Información sobre qué equipos han declarado
        estado.equiposQueHanDeclarado = [];
        if (this.puntosDeclaradosPorJugador) {
            Object.values(this.puntosDeclaradosPorJugador).forEach(declaracion => {
                if (declaracion.jugadorId) {
                    const jugador = this.ronda.jugadoresEnOrden.find(j => j.id === declaracion.jugadorId);
                    if (jugador && !estado.equiposQueHanDeclarado.includes(jugador.equipoId)) {
                        estado.equiposQueHanDeclarado.push(jugador.equipoId);
                    }
                }
            });
        }

        // Información sobre niveles de canto disponibles
        estado.nivelesCantoDisponibles = this._obtenerNivelesCantoDisponibles();

        return estado;
    }

    _obtenerNivelesCantoDisponibles() {
        if (!this.cantado) {
            return ['ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO'];
        }

        // Si ya hay un canto pendiente de respuesta, calcular las opciones de recanto
        if (this.estadoResolucion === 'cantado_pendiente_respuesta') {
            const opciones = [];
            
            // Analizar la secuencia actual de cantos
            const secuenciaActual = this.cantosRealizados.map(c => c.tipoOriginal);
            console.log(`[ENVIDO] Calculando opciones para secuencia: ${secuenciaActual.join(' → ')}`);
            
            // Caso 1: Solo se cantó ENVIDO
            if (secuenciaActual.length === 1 && secuenciaActual[0] === 'ENVIDO') {
                opciones.push('ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO');
            }
            // Caso 2: ENVIDO → ENVIDO (secuencia ENVIDO_ENVIDO)
            else if (secuenciaActual.length === 2 && secuenciaActual.join('_') === 'ENVIDO_ENVIDO') {
                opciones.push('REAL_ENVIDO', 'FALTA_ENVIDO');
            }
            // Caso 3: ENVIDO → REAL_ENVIDO
            else if (secuenciaActual.length === 2 && secuenciaActual.join('_') === 'ENVIDO_REAL_ENVIDO') {
                opciones.push('FALTA_ENVIDO');
            }
            // Caso 4: Solo se cantó REAL_ENVIDO
            else if (secuenciaActual.length === 1 && secuenciaActual[0] === 'REAL_ENVIDO') {
                opciones.push('FALTA_ENVIDO');
            }
            // Caso 5: ENVIDO → ENVIDO → REAL_ENVIDO
            else if (secuenciaActual.length === 3 && secuenciaActual.join('_') === 'ENVIDO_ENVIDO_REAL_ENVIDO') {
                opciones.push('FALTA_ENVIDO');
            }
            // Si ya se cantó FALTA_ENVIDO, no hay más opciones
            else if (secuenciaActual.some(c => c === 'FALTA_ENVIDO')) {
                // No se puede subir más que FALTA_ENVIDO
                return [];
            }
            
            console.log(`[ENVIDO] Opciones disponibles: ${opciones.join(', ')}`);
            return opciones;
        }

        return [];
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

        // Calcular puntos usando la nueva función
        this.puntosEnJuegoCalculados = this._calcularPuntosEnvido(this.nivelActual, true);
        this.ronda.puntosGanadosEnvido = this.puntosEnJuegoCalculados;
        
        // ✅ NUEVO: Verificar victoria inmediata después de "Son Buenas"
        const partidaTerminada = this._verificarVictoriaInmediata();
        if (partidaTerminada) {
            // La partida terminó, no continuar con la ronda
            console.log("[ENVIDO] Partida terminada por victoria inmediata (Son Buenas) - no restaurar turno");
            return true;
        }
        
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
        
        // Solo restaurar turno si la partida no terminó
        this.resolverDependenciaTrucoYRestaurarTurno();
        
        return true;
    }

    // Called when a card is played to check if envido can still be sung
    onCartaJugada() {
        // If we're in the first hand and all players have played their first card,
        // envido can no longer be sung
        if (this.ronda.turnoHandler.manoActualNumero === 1) {
            const cartasJugadasEnPrimeraMano = this.ronda.turnoHandler.cartasEnMesaManoActual.length;
            const totalJugadores = this.ronda.jugadoresEnOrden.length;
            
            if (cartasJugadasEnPrimeraMano >= totalJugadores) {
                this.puedeCantarEnvidoGeneral = false;
                console.log('Primera mano completada - Envido ya no se puede cantar');
            }
        }
    }
}

module.exports = RondaEnvidoHandler;