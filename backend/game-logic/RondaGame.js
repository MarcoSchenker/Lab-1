const Mazo = require('./Mazo');
const RondaTurnoHandler = require('./RondaTurnoHandler');
const RondaEnvidoHandler = require('./RondaEnvidoHandler');
const RondaTrucoHandler = require('./RondaTrucoHandler');

class RondaGame {
    constructor(numeroRonda, jugadoresEnOrden, jugadorMano, equipos, partida, notificarEstadoCallback, persistirAccionCallback) {
        this.numeroRonda = numeroRonda;
        this.jugadoresEnOrden = jugadoresEnOrden;
        this.jugadorManoRonda = jugadorMano;
        this.equipos = equipos;
        this.partida = partida; // ✅ Agregar referencia a la partida
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
            // ✅ PROBLEMA 1 CORREGIDO: Implementar "Envido va primero" correctamente
            if (tipoCanto === 'TRUCO' && 
                this.turnoHandler.manoActualNumero === 1 && 
                !this.envidoHandler.cantado &&
                this.envidoHandler.puedeCantarEnvidoGeneral) {
                
                // Marcar que hay un truco pendiente por "envido va primero"
                this.trucoPendientePorEnvidoPrimero = true;
                
                // Registrar el truco pero mantenerlo en estado especial
                const resultado = this.trucoHandler.registrarCanto(jugadorId, tipoCanto);
                
                if (resultado) {
                    console.log(`[RONDA] ⚡ Truco cantado en primera mano - activando "Envido va primero"`);
                    this._actualizarEstadoParaNotificar('truco_pendiente_por_envido_primero', {
                        jugadorId,
                        tipoCanto,
                        trucoPendientePorEnvidoPrimero: true
                    });
                }
                
                return resultado;
            }
            
            return this.trucoHandler.registrarCanto(jugadorId, tipoCanto);
        } else {
            console.warn(`Tipo de canto desconocido: ${tipoCanto}`);
            return false;
        }
    }

    manejarRespuestaCanto(jugadorId, respuesta, cantoRespondidoTipo, nuevoCantoSiMas) {
        // cantoRespondidoTipo y nuevoCantoSiMas pueden ser útiles para lógica más fina,
        // pero la respuesta misma (QUIERO, NO_QUIERO, o un nuevo canto) es clave.
        if (this.envidoHandler.estaPendienteDeRespuesta()) {
            const resultado = this.envidoHandler.registrarRespuesta(jugadorId, respuesta);
            
            // Si el envido ha sido completamente resuelto y hay un truco pendiente por Envido Primero
            if (resultado && 
                this.trucoPendientePorEnvidoPrimero && 
                !this.envidoHandler.estaPendienteDeRespuesta() &&
                !this.envidoHandler.estadoResolucion.includes('querido_pendiente_puntos')) {
                
                console.log("Envido resuelto, retomando el truco pendiente por Envido Primero");
                this.trucoPendientePorEnvidoPrimero = false;
                
                // Notificar que ahora se debe responder al truco
                this._actualizarEstadoParaNotificar('retomar_truco_pendiente', {
                    trucoState: this.trucoHandler.getEstado()
                });
            }
            return resultado;
        } else if (this.trucoHandler.estaPendienteDeRespuesta()) {
            return this.trucoHandler.registrarRespuesta(jugadorId, respuesta);
        } else if (this.envidoHandler.estadoResolucion === 'querido_pendiente_puntos') {
            // Si es "Son Buenas" para el envido
            if (respuesta === 'SON_BUENAS_ENVIDO') {
                const resultado = this.envidoHandler.registrarSonBuenas(jugadorId);
                
                // Si el envido se ha resuelto completamente y hay truco pendiente por Envido Primero
                if (resultado && 
                    this.trucoPendientePorEnvidoPrimero && 
                    this.envidoHandler.estadoResolucion === 'resuelto') {
                    
                    console.log("Envido resuelto con 'Son Buenas', retomando el truco pendiente");
                    this.trucoPendientePorEnvidoPrimero = false;
                    
                    // Notificar que ahora se debe responder al truco
                    this._actualizarEstadoParaNotificar('retomar_truco_pendiente', {
                        trucoState: this.trucoHandler.getEstado()
                    });
                }
                return resultado;
            } 
            // Si son puntos declarados para el envido
            else if (!isNaN(parseInt(respuesta))) {
                const resultado = this.envidoHandler.registrarPuntosDeclarados(jugadorId, parseInt(respuesta));
                
                // Similar a la lógica anterior, verificar si ahora debemos retomar el truco
                if (resultado && 
                    this.trucoPendientePorEnvidoPrimero && 
                    this.envidoHandler.estadoResolucion === 'resuelto') {
                    
                    console.log("Puntos de envido declarados, retomando el truco pendiente por Envido Primero");
                    this.trucoPendientePorEnvidoPrimero = false;
                    
                    // Notificar que ahora se debe responder al truco
                    this._actualizarEstadoParaNotificar('retomar_truco_pendiente', {
                        trucoState: this.trucoHandler.getEstado()
                    });
                }
                return resultado;
            }
        }

        console.warn(`No hay canto pendiente de respuesta para el jugador ${jugadorId} o respuesta desconocida ${respuesta}`);
        return false;
    }
    
    manejarIrseAlMazo(jugadorId) {
        // Irse al mazo generalmente afecta al truco.
        return this.trucoHandler.registrarMazo(jugadorId);
    }

    /**
     * Maneja la declaración de puntos de envido por parte de un jugador
     * @param {number} jugadorId - ID del jugador que declara puntos
     * @param {number} puntos - Puntos de envido que declara
     * @returns {boolean} - true si la declaración fue exitosa
     */
    manejarDeclaracionPuntosEnvido(jugadorId, puntos) {
        console.log(`[RONDA] 🔢 Jugador ${jugadorId} declara ${puntos} puntos de envido`);
        
        if (!this.envidoHandler.declaracionEnCurso) {
            console.warn(`[RONDA] ❌ No hay declaración de envido en curso`);
            this.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'No hay una declaración de envido en curso.' 
            });
            return false;
        }

        const resultado = this.envidoHandler.registrarPuntosDeclarados(jugadorId, puntos);
        
        // Si el envido se resuelve y hay truco pendiente por "Envido Primero"
        if (resultado && 
            this.trucoPendientePorEnvidoPrimero && 
            this.envidoHandler.estadoResolucion === 'resuelto') {
            
            console.log("[RONDA] Envido resuelto, retomando truco pendiente por Envido Primero");
            this.trucoPendientePorEnvidoPrimero = false;
            
            this._actualizarEstadoParaNotificar('retomar_truco_pendiente', {
                trucoState: this.trucoHandler.getEstado()
            });
        }
        
        return resultado;
    }

    /**
     * Maneja cuando un jugador dice "Son Buenas" en el envido
     * @param {number} jugadorId - ID del jugador que dice "son buenas"
     * @returns {boolean} - true si la acción fue exitosa
     */
    manejarDeclaracionSonBuenas(jugadorId) {
        console.log(`[RONDA] ✅ Jugador ${jugadorId} dice "Son Buenas"`);
        
        if (!this.envidoHandler.declaracionEnCurso) {
            console.warn(`[RONDA] ❌ No hay declaración de envido en curso para "Son Buenas"`);
            this.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'No hay una declaración de envido en curso.' 
            });
            return false;
        }

        const resultado = this.envidoHandler.registrarSonBuenas(jugadorId);
        
        // Si el envido se resuelve y hay truco pendiente por "Envido Primero"
        if (resultado && 
            this.trucoPendientePorEnvidoPrimero && 
            this.envidoHandler.estadoResolucion === 'resuelto') {
            
            console.log("[RONDA] Envido resuelto con 'Son Buenas', retomando truco pendiente por Envido Primero");
            this.trucoPendientePorEnvidoPrimero = false;
            
            this._actualizarEstadoParaNotificar('retomar_truco_pendiente', {
                trucoState: this.trucoHandler.getEstado()
            });
        }
        
        return resultado;
    }

    /**
     * Maneja cuando un jugador se va al mazo
     * @param {number} jugadorId - ID del jugador que se va al mazo
     * @returns {boolean} - true si la acción fue exitosa
     */
    manejarIrseAlMazo(jugadorId) {
        console.log(`[RONDA] 🏃 Jugador ${jugadorId} se va al mazo`);
        
        const jugador = this.jugadoresEnOrden.find(j => j.id === jugadorId);
        if (!jugador) {
            console.warn(`[RONDA] ❌ Jugador ${jugadorId} no encontrado`);
            return false;
        }

        // Validar que el jugador puede irse al mazo (debe ser su turno o estar en una situación de respuesta)
        const puedeIrseAlMazo = this._validarPuedeIrseAlMazo(jugadorId);
        if (!puedeIrseAlMazo) {
            this.notificarEstado('error_accion_juego', { 
                jugadorId, 
                mensaje: 'No puedes irte al mazo en este momento.' 
            });
            return false;
        }

        // Delegar la lógica del mazo al trucoHandler que maneja correctamente los puntos
        return this.trucoHandler.registrarMazo(jugadorId);
    }

    /**
     * Valida si un jugador puede irse al mazo en el momento actual
     * @param {number} jugadorId - ID del jugador
     * @returns {boolean} - true si puede irse al mazo
     */
    _validarPuedeIrseAlMazo(jugadorId) {
        // Un jugador puede irse al mazo si:
        // 1. Es su turno para jugar una carta
        // 2. Debe responder a un truco
        // 3. Debe responder a un envido (aunque esto sería raro)
        
        const esSuTurno = this.turnoHandler.jugadorTurnoActual && 
                         this.turnoHandler.jugadorTurnoActual.id === jugadorId;
        
        const debeResponderTruco = this.trucoHandler.equipoDebeResponderTruco &&
                                  this.jugadoresEnOrden.find(j => j.id === jugadorId)?.equipoId === 
                                  this.trucoHandler.equipoDebeResponderTruco.id;
        
        const debeResponderEnvido = this.envidoHandler.equipoDebeResponderEnvido &&
                                   this.jugadoresEnOrden.find(j => j.id === jugadorId)?.equipoId === 
                                   this.envidoHandler.equipoDebeResponderEnvido.id;
        
        return esSuTurno || debeResponderTruco || debeResponderEnvido;
    }

    _finalizarRondaLogica() {
        // Esta función es llamada por los handlers cuando la ronda realmente termina (por juego o por "no quiero" al truco, o mazo).
        // 1. Calcular puntos finales del envido (si no se hizo ya en el handler)
        if (this.envidoHandler.querido && this.envidoHandler.estadoResolucion === 'resuelto' && this.envidoHandler.ganadorEnvidoEquipoId) {
            // Si el envido fue querido y resuelto (puntos declarados), y tenemos un ganador.
            // El cálculo de puntos para Falta Envido es especial.
            let puntosFinalesEnvido = 0;
            const ultimoCantoEnvido = this.envidoHandler.cantosRealizados[this.envidoHandler.cantosRealizados.length - 1];
            if (ultimoCantoEnvido && ultimoCantoEnvido.tipoNormalizado && ultimoCantoEnvido.tipoNormalizado.includes('FALTA_ENVIDO')) {
                const equipoGanador = this.equipos.find(e => e.id === this.envidoHandler.ganadorEnvidoEquipoId);
                const equipoPerdedor = this.equipos.find(e => e.id !== this.envidoHandler.ganadorEnvidoEquipoId);
                if (equipoGanador && equipoPerdedor) {
                    // Obtener puntos de la partida desde la instancia correcta
                    const partida = this.partida;
                    if (partida && partida.puntosVictoria && equipoPerdedor.puntosPartida !== undefined) {
                        puntosFinalesEnvido = partida.puntosVictoria - equipoPerdedor.puntosPartida;
                        if (puntosFinalesEnvido <= 0) puntosFinalesEnvido = 1; // Mínimo 1 punto
                    } else {
                        puntosFinalesEnvido = 1; // Valor por defecto si no se puede calcular
                    }
                }
            } else {
                puntosFinalesEnvido = this.envidoHandler.puntosEnJuegoCalculados || this.envidoHandler.puntosEnJuego || 0;
            }
            this.puntosGanadosEnvido = puntosFinalesEnvido;
            // Los puntos ya deberían haber sido sumados al equipo por el handler de envido al resolverse.
        } else if (!this.envidoHandler.querido && this.envidoHandler.estadoResolucion === 'resuelto' && this.envidoHandler.ganadorEnvidoEquipoId) {
            // Si no se quiso el envido, los puntos ya se calcularon y sumaron en el handler.
            this.puntosGanadosEnvido = this.envidoHandler.puntosEnJuegoCalculados || 0;
        } else if (this.envidoHandler.cantado && this.envidoHandler.ganadorEnvidoEquipoId && this.envidoHandler.estadoResolucion === 'resuelto') {
            // Caso general: envido fue cantado y resuelto
            this.puntosGanadosEnvido = this.envidoHandler.puntosEnJuegoCalculados || 0;
        } else {
            // No hubo envido o no fue resuelto
            this.puntosGanadosEnvido = 0;
        }

        // Asegurar que puntosGanadosEnvido nunca sea undefined
        if (this.puntosGanadosEnvido === undefined || this.puntosGanadosEnvido === null) {
            this.puntosGanadosEnvido = 0;
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