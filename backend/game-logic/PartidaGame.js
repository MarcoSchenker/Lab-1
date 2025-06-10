const EquipoGame = require('./EquipoGame');
const JugadorGame = require('./JugadorGame');
const RondaGame = require('./RondaGame');

/**
 * Representa una partida completa de Truco.
 * Orquesta las rondas, equipos, puntajes y el estado general del juego.
 */
class PartidaGame {
    /**
     * @param {string} codigoSala El código de la sala donde se juega la partida.
     * @param {Array<object>} jugadoresInfo Array de objetos con info de los jugadores (id, nombre_usuario).
     * @param {string} tipoPartida '1v1', '2v2', '3v3'.
     * @param {number} puntosVictoria Puntos para ganar la partida (e.g., 15 o 30).
     * @param {function} notificarEstadoGlobalCallback Callback para notificar el estado global de la partida.
     * @param {function} persistirPartidaCallback Callback para persistir el estado de la partida en DB.
     * @param {function} persistirAccionCallback Callback para persistir acciones individuales en DB.
     * @param {function} finalizarPartidaCallback Callback para acciones cuando la partida termina (e.g., actualizar sala).
     */
    constructor(codigoSala, jugadoresInfo, tipoPartida, puntosVictoria, notificarEstadoGlobalCallback, persistirPartidaCallback, persistirAccionCallback, finalizarPartidaCallback) {
        this.codigoSala = codigoSala;
        this.tipoPartida = tipoPartida;
        this.puntosVictoria = puntosVictoria;
        this.estadoPartida = 'configurando'; // 'configurando', 'en_juego', 'finalizada', 'pausada'
        
        this.equipos = []; // Array de EquipoGame
        this.jugadores = []; // Array de JugadorGame, ordenados globalmente para la partida
        this.ordenJugadoresRonda = []; // Array de JugadorGame, en el orden de juego para la ronda actual

        this.rondaActual = null; // Objeto RondaGame
        this.numeroRondaActual = 0;
        this.historialRondas = []; // Guardar resumen de rondas pasadas
        this.indiceJugadorManoGlobal = 0; 

        this.notificarEstadoGlobal = notificarEstadoGlobalCallback;
        this.persistirPartida = persistirPartidaCallback;
        this.persistirAccion = persistirAccionCallback;
        this.finalizarPartidaCallback = finalizarPartidaCallback;

        this._configurarPartida(jugadoresInfo);
    }

    _configurarPartida(jugadoresInfo) {
        console.log(`[PARTIDA] Configurando partida ${this.codigoSala} para ${this.tipoPartida} a ${this.puntosVictoria} puntos.`);
        console.log(`[PARTIDA] Información de jugadores recibida:`, jugadoresInfo);
        
        try {
            // Verificación previa de los datos
            if (!jugadoresInfo || !Array.isArray(jugadoresInfo) || jugadoresInfo.length < 2) {
                throw new Error(`Datos de jugadores inválidos o insuficientes: ${JSON.stringify(jugadoresInfo)}`);
            }
            
            // 1. Crear Jugadores
            jugadoresInfo.forEach(info => {
                if (!info.id || !info.nombre_usuario) {
                    throw new Error(`Información de jugador incompleta: ${JSON.stringify(info)}`);
                }
                console.log(`[PARTIDA] Creando jugador: ${info.nombre_usuario} (ID: ${info.id})`);
                this.jugadores.push(new JugadorGame(info.id, info.nombre_usuario, null)); // equipoId se asigna después
            });

            // 2. Crear Equipos y Asignar Jugadores
            console.log(`[PARTIDA] Asignando jugadores a equipos...`);
            this._asignarJugadoresAEquipos(); 
            
            // Verificación post-creación
            if (!this.equipos || this.equipos.length === 0) {
                throw new Error('No se pudieron crear los equipos correctamente');
            }
            if (!this.jugadores || this.jugadores.length === 0) {
                throw new Error('No se pudieron crear los jugadores correctamente');
            }

            // 3. Determinar el primer mano de la partida (puede ser el primer jugador o aleatorio)
            this.indiceJugadorManoGlobal = 0; // Por simplicidad, el primer jugador en la lista global

            console.log(`[PARTIDA] Cambiando estado de 'configurando' a 'en_juego'`);
            this.estadoPartida = 'en_juego';
            
            console.log(`[PARTIDA] Iniciando primera ronda...`);
            this.iniciarNuevaRonda();
            
            // Notificar estado inicial para asegurar que todos los clientes reciban la actualización
            console.log(`[PARTIDA] ✅ Notificando estado inicial...`);
            
            // Enviar estado a cada jugador específicamente y luego una notificación general
            for (const jugador of this.jugadores) {
                const estadoJuego = this.obtenerEstadoGlobalParaCliente(jugador.id);
                console.log(`[PARTIDA] Enviando estado inicial a jugador ${jugador.id} (${jugador.nombreUsuario})`);
                this.notificarEstadoGlobal(this.codigoSala, 'estado_juego_actualizado', estadoJuego);
            }
            
            // Enviar evento adicional de partida configurada/iniciada
            this._notificarEstadoGlobalActualizado('partida_configurada');
            this.notificarEstadoGlobal(this.codigoSala, 'partida_iniciada', { codigo_sala: this.codigoSala });
            
            console.log(`[PARTIDA] ✅ Partida configurada exitosamente`);
        } catch (error) {
            console.error(`[PARTIDA] ❌ Error al configurar partida: ${error.message}`, error);
            this.estadoPartida = 'error';
            
            // Intentar notificar el error a los clientes si es posible
            if (this.notificarEstadoGlobal) {
                this.notificarEstadoGlobal(this.codigoSala, 'error_juego', {
                    message: `Error al configurar la partida: ${error.message}`,
                    codigo_sala: this.codigoSala
                });
            }
        }
    }

    _asignarJugadoresAEquipos() {
        // Lógica para crear equipos y distribuir jugadores.
        // Ejemplo para 2 equipos:
        const equipo1 = new EquipoGame('equipo_1', 'Equipo 1');
        const equipo2 = new EquipoGame('equipo_2', 'Equipo 2');
        this.equipos.push(equipo1, equipo2);

        if (this.tipoPartida === '1v1' && this.jugadores.length === 2) {
            equipo1.agregarJugador(this.jugadores[0]);
            equipo2.agregarJugador(this.jugadores[1]);
        } else if (this.tipoPartida === '2v2' && this.jugadores.length === 4) {
            // Asignación alternada o predefinida
            equipo1.agregarJugador(this.jugadores[0]);
            equipo1.agregarJugador(this.jugadores[2]);
            equipo2.agregarJugador(this.jugadores[1]);
            equipo2.agregarJugador(this.jugadores[3]);
            // Determinar quién es pie en cada equipo
            this.jugadores[2].esPie = true; // Ejemplo
            this.jugadores[3].esPie = true; // Ejemplo
        } else if (this.tipoPartida === '3v3' && this.jugadores.length === 6) {
            // Asignación similar
            equipo1.agregarJugador(this.jugadores[0]);
            equipo1.agregarJugador(this.jugadores[2]);
            equipo1.agregarJugador(this.jugadores[4]);
            equipo2.agregarJugador(this.jugadores[1]);
            equipo2.agregarJugador(this.jugadores[3]);
            equipo2.agregarJugador(this.jugadores[5]);
            // Determinar quién es pie
        } else {
            console.error("Configuración de jugadores/tipo de partida no válida.");
            // Manejar error
        }
        console.log("Equipos configurados:", this.equipos.map(e => ({id: e.id, jugadores: e.jugadores.map(j=>j.nombreUsuario)})));
    }
    
    _determinarOrdenJuegoRonda(jugadorManoRonda) {
        const indiceMano = this.jugadores.findIndex(j => j.id === jugadorManoRonda.id);
        if (indiceMano === -1) {
            console.error("Jugador mano de ronda no encontrado en la lista global.");
            return [...this.jugadores]; // Fallback
        }
        // Rotar el array de jugadores para que el jugador mano esté primero
        this.ordenJugadoresRonda = [
            ...this.jugadores.slice(indiceMano),
            ...this.jugadores.slice(0, indiceMano)
        ];
    }

    iniciarNuevaRonda() {
        console.log(`[PARTIDA] Verificando estado antes de iniciar ronda. Estado actual: '${this.estadoPartida}'`);
        if (this.estadoPartida !== 'en_juego') {
            console.log(`[PARTIDA] ❌ No se puede iniciar ronda. Estado esperado: 'en_juego', estado actual: '${this.estadoPartida}'`);
            return;
        }

        this.numeroRondaActual++;
        const jugadorManoDeEstaRonda = this.jugadores[this.indiceJugadorManoGlobal];
        
        console.log(`[PARTIDA] ✅ Iniciando ronda ${this.numeroRondaActual}. Mano: ${jugadorManoDeEstaRonda.nombreUsuario} (ID: ${jugadorManoDeEstaRonda.id})`);
        
        this._determinarOrdenJuegoRonda(jugadorManoDeEstaRonda);

        console.log(`Partida ${this.codigoSala}: Iniciando ronda ${this.numeroRondaActual}. Mano global: ${jugadorManoDeEstaRonda.nombreUsuario}`);

        console.log(`[PARTIDA] Creando RondaGame con ${this.ordenJugadoresRonda.length} jugadores en orden`);
        this.rondaActual = new RondaGame(
            this.numeroRondaActual,
            this.ordenJugadoresRonda, // Jugadores en orden de juego para la ronda
            jugadorManoDeEstaRonda,   // Quién es mano en esta ronda específica
            this.equipos,
            (tipoEvento, detalleEvento) => this._manejarNotificacionRonda(tipoEvento, detalleEvento),
            (accion) => this._manejarPersistenciaAccionRonda(accion)
        );

        // Rotar el mano para la siguiente ronda
        this.indiceJugadorManoGlobal = (this.indiceJugadorManoGlobal + 1) % this.jugadores.length;
        
        console.log(`[PARTIDA] Notificando nueva ronda iniciada...`);
        this._notificarEstadoGlobalActualizado('nueva_ronda_iniciada');
        console.log(`[PARTIDA] Persistiendo estado de partida...`);
        this.persistirEstadoPartida(); // Guardar estado de la partida (nueva ronda, etc.)
    }

    _manejarNotificacionRonda(tipoEvento, detalleEvento) {
        // Este método recibe notificaciones de la RondaGame actual
        // y las retransmite o procesa a nivel de PartidaGame.
        console.log(`PartidaGame: Notificación de Ronda - ${tipoEvento}`, detalleEvento);

        if (tipoEvento === 'ronda_finalizada') {
            this._procesarRondaFinalizada(detalleEvento);
        } else {
            // Para otros eventos de ronda (carta_jugada, canto_realizado, etc.),
            // simplemente los retransmitimos como parte del estado global.
            this._notificarEstadoGlobalActualizado(tipoEvento, detalleEvento);
        }
    }
    
    _manejarPersistenciaAccionRonda(accion) {
        // Añadir contexto de partida si es necesario y llamar al callback de persistencia
        const accionConContexto = {
            ...accion,
            partida_estado_id: this.idEnDB, // Asumiendo que tenemos un ID de la partida en la DB
            ronda_numero: this.numeroRondaActual,
        };
        this.persistirAccion(accionConContexto);
    }

    _procesarRondaFinalizada(estadoRondaFinalizada) {
        // 1. Sumar puntos a los equipos
        const equipoGanadorRonda = this.equipos.find(e => e.id === estadoRondaFinalizada.ganadorRondaEquipoId);
        let puntosEnvido = 0;
        let puntosTruco = 0;

        if (estadoRondaFinalizada.puntosGanadosEnvido > 0) {
            // Determinar qué equipo ganó los puntos del envido.
            // Si this.rondaActual.envido.ganadorEnvidoEquipoId está seteado, ese equipo gana.
            // Si fue un "no quiero" al envido, el equipo que cantó el último envido gana.
            const equipoGanadorEnvido = this.equipos.find(e => e.id === this.rondaActual.envido.ganadorEnvidoEquipoId) || 
                                      (this.rondaActual.envido.cantos.length > 0 && !this.rondaActual.envido.querido ? this.equipos.find(e => e.id === this.rondaActual.envido.cantos[this.rondaActual.envido.cantos.length -1].equipoId) : null);
            if (equipoGanadorEnvido) {
                equipoGanadorEnvido.sumarPuntos(estadoRondaFinalizada.puntosGanadosEnvido);
                puntosEnvido = estadoRondaFinalizada.puntosGanadosEnvido;
                console.log(`Equipo ${equipoGanadorEnvido.nombre} sumó ${puntosEnvido} puntos de envido.`);
            }
        }
        if (equipoGanadorRonda && estadoRondaFinalizada.puntosGanadosTruco > 0) {
            equipoGanadorRonda.sumarPuntos(estadoRondaFinalizada.puntosGanadosTruco);
            puntosTruco = estadoRondaFinalizada.puntosGanadosTruco;
            console.log(`Equipo ${equipoGanadorRonda.nombre} sumó ${puntosTruco} puntos de truco.`);
        }
        
        this.historialRondas.push({
            numeroRonda: estadoRondaFinalizada.numeroRonda,
            ganadorRondaEquipoId: estadoRondaFinalizada.ganadorRondaEquipoId,
            puntosEnvido,
            puntosTruco,
            // detalleManos: estadoRondaFinalizada.manosJugadas // Podría ser mucho detalle
        });

        // 2. Verificar si hay un ganador de la partida
        const ganadorPartida = this.equipos.find(e => e.puntosPartida >= this.puntosVictoria);
        if (ganadorPartida) {
            this.estadoPartida = 'finalizada';
            console.log(`Partida ${this.codigoSala} finalizada. Ganador: Equipo ${ganadorPartida.nombre}`);
            this._notificarEstadoGlobalActualizado('partida_finalizada', { ganadorPartidaId: ganadorPartida.id });
            this.persistirEstadoPartida();
            if (this.finalizarPartidaCallback) {
                this.finalizarPartidaCallback(this.codigoSala, ganadorPartida.id);
            }
        } else {
            // Iniciar nueva ronda
            this.iniciarNuevaRonda();
        }
    }

    // --- Métodos para que el gameLogicHandler llame ---
    manejarAccionJugador(jugadorId, tipoAccion, datosAccion) {
        if (this.estadoPartida !== 'en_juego' || !this.rondaActual) {
            console.warn("Acción de jugador recibida pero la partida no está en juego o no hay ronda activa.");
            return; // O enviar error
        }

        // Delegar la acción a la ronda actual
        let resultadoAccion = false;
        switch (tipoAccion) {
            case 'JUGAR_CARTA':
                resultadoAccion = this.rondaActual.manejarJugarCarta(jugadorId, datosAccion.idUnicoCarta);
                break;
            case 'CANTO': // Genérico para envido, truco, etc.
                resultadoAccion = this.rondaActual.manejarCanto(jugadorId, datosAccion.tipoCanto, datosAccion.detalleCanto);
                break;
            case 'RESPUESTA_CANTO':
                resultadoAccion = this.rondaActual.manejarRespuestaCanto(jugadorId, datosAccion.respuesta, datosAccion.cantoRespondidoTipo, datosAccion.nuevoCantoSiMas);
                break;
            case 'IRSE_AL_MAZO':
                resultadoAccion = this.rondaActual.manejarIrseAlMazo(jugadorId);
                break;
            // Otros tipos de acción...
            default:
                console.warn(`Tipo de acción no reconocido: ${tipoAccion}`);
        }
        
        if (resultadoAccion) {
            // La notificación ya la hace RondaGame internamente y se propaga
            // this._notificarEstadoGlobalActualizado(); // Redundante si RondaGame notifica bien
            this.persistirEstadoPartida(); // Guardar el estado general de la partida después de una acción válida
        } else {
            // La ronda ya debería haber notificado el error al jugador específico.
            console.log(`Acción ${tipoAccion} de ${jugadorId} no fue procesada exitosamente por la ronda.`);
        }
    }
    
    // --- Notificaciones y Estado Global ---
    _notificarEstadoGlobalActualizado(eventoRaiz = 'estado_juego_actualizado', detalleEventoRaiz = {}) {
        console.log(`[PARTIDA] Notificando estado global actualizado. Evento: ${eventoRaiz}`);
        
        if (this.notificarEstadoGlobal) {
            const estadoGlobal = this.obtenerEstadoGlobalParaCliente();
            console.log(`[PARTIDA] Estado global obtenido para sala ${this.codigoSala}:`, {
                codigoSala: estadoGlobal.codigoSala,
                estadoPartida: estadoGlobal.estadoPartida,
                numeroJugadores: estadoGlobal.jugadores?.length,
                numeroRondaActual: estadoGlobal.numeroRondaActual
            });
            
            // Emitir el evento específico (por ejemplo, 'ronda_iniciada', 'turno_actualizado', etc.)
            this.notificarEstadoGlobal(this.codigoSala, eventoRaiz, { ...estadoGlobal, ...detalleEventoRaiz });
            
            // Emitir SIEMPRE el estado global bajo el nombre 'estado_juego_actualizado'
            if (eventoRaiz !== 'estado_juego_actualizado') {
                this.notificarEstadoGlobal(this.codigoSala, 'estado_juego_actualizado', estadoGlobal);
            }
            
            console.log(`[PARTIDA] ✅ Estado emitido a sala ${this.codigoSala}`);
        } else {
            console.log(`[PARTIDA] ❌ No hay callback de notificación configurado`);
        }
    }

    obtenerEstadoGlobalParaCliente(solicitanteJugadorId = null) {
        console.log(`[PARTIDA] Obteniendo estado global para cliente. Solicitante: ${solicitanteJugadorId}`);
        
        try {
            // Verificar que tengamos los datos necesarios para construir un estado válido
            if (!this.equipos || this.equipos.length === 0 || !this.jugadores || this.jugadores.length === 0) {
                console.error(`[PARTIDA] ❌ Faltan datos esenciales para construir estado. Equipos: ${this.equipos?.length}, Jugadores: ${this.jugadores?.length}`);
                return {
                    codigoSala: this.codigoSala,
                    tipoPartida: this.tipoPartida,
                    estadoPartida: 'error',
                    mensajeError: 'Error al configurar la partida. Faltan datos esenciales.'
                };
            }
            
            // Construye el objeto de estado completo para enviar a los clientes.
            let estadoGlobal = {
                codigoSala: this.codigoSala,
                tipoPartida: this.tipoPartida,
                puntosVictoria: this.puntosVictoria,
                estadoPartida: this.estadoPartida,
                equipos: this.equipos.map(e => ({
                    id: e.id,
                    nombre: e.nombre,
                    puntosPartida: e.puntosPartida,
                    jugadoresIds: e.jugadores?.map(j => j.id) || []
                })),
                jugadores: this.jugadores.map(j => ({
                    id: j.id,
                    nombreUsuario: j.nombreUsuario,
                    equipoId: j.equipoId,
                    esPie: j.esPie,
                    // Enviar cartas solo al jugador solicitante o si la partida terminó (para revisión)
                    cartasMano: (solicitanteJugadorId === j.id || this.estadoPartida === 'finalizada') ? 
                        j.cartasMano?.map(c=>({...c})) || [] : null,
                    cartasJugadasRonda: j.cartasJugadasRonda?.map(c=>({...c})) || [],
                    estadoConexion: j.estadoConexion,
                })),
                numeroRondaActual: this.numeroRondaActual,
                indiceJugadorManoGlobal: this.indiceJugadorManoGlobal, // Quién será mano en la siguiente ronda
                estadoRondaActual: this.rondaActual ? this.rondaActual.obtenerEstadoRonda() : null,
                historialRondas: this.historialRondas || [],
                // Información adicional que el cliente necesite
                
                // Estado de la ronda actual
                rondaActual: {
                    numeroRonda: this.numeroRondaActual,
                    jugadorManoId: this.rondaActual?.jugadorManoRonda?.id || null,
                    ganadorRondaEquipoId: this.rondaActual?.ganadorRondaEquipoId || null,
                    turnoInfo: this.rondaActual?.turnoHandler?.getEstado() || {
                        jugadorTurnoActualId: null,
                        manoActualNumero: 1,
                        cartasEnMesaManoActual: [],
                        manosJugadas: []
                    },
                    envidoInfo: this.rondaActual?.envidoHandler?.getEstado() || {
                        cantado: false,
                        querido: false,
                        nivelActual: '',
                        estadoResolucion: '',
                        cantadoPorJugadorId: null,
                        cantadoPorEquipoId: null,
                        puntosEnJuego: 0,
                        equipoGanadorId: null,
                        puntosDeclarados: {}
                    },
                    trucoInfo: this.rondaActual?.trucoHandler?.getEstado() || {
                        cantado: false,
                        querido: false,
                        nivelActual: '',
                        puntosEnJuego: 1,
                        cantadoPorJugadorId: null,
                        cantadoPorEquipoId: null,
                        estadoResolucion: '',
                        equipoDebeResponderTrucoId: null,
                        jugadorTurnoAlMomentoDelCantoId: null
                    },
                    trucoPendientePorEnvidoPrimero: this.rondaActual?.trucoPendientePorEnvidoPrimero || false
                }
            };
            
            // Obtener preferencias de skin para todos los jugadores
            const jugadoresSkins = {};
            for (const jugador of this.jugadores) {
                // Recuperar de la base de datos la skin preferida para este jugador
                jugadoresSkins[jugador.id] = jugador.skinPreferida || 'Original'; // Default si no hay preferencia
            }
            
            console.log(`[PARTIDA] Estado global preparado:`, {
                equipos: estadoGlobal.equipos.length,
                jugadores: estadoGlobal.jugadores.length,
                rondaActual: !!estadoGlobal.rondaActual,
                numeroRondaActual: estadoGlobal.numeroRondaActual,
                solicitante: solicitanteJugadorId
            });
            
            return {
                ...estadoGlobal,
                jugadores: this.jugadores.map(j => ({
                    id: j.id,
                    nombreUsuario: j.nombreUsuario,
                    equipoId: j.equipoId,
                    esPie: j.esPie,
                    skinPreferida: jugadoresSkins[j.id], // Añadir la preferencia de skin
                    cartasMano: (solicitanteJugadorId === j.id || this.estadoPartida === 'finalizada') ? 
                        j.cartasMano?.map(c=>({...c})) || [] : null,
                    cartasJugadasRonda: j.cartasJugadasRonda?.map(c=>({...c})) || [],
                    estadoConexion: j.estadoConexion,
                })),
            };
        } catch (error) {
            console.error(`[PARTIDA] Error al preparar estado global para cliente: ${error.message}`, error);
            return {
                codigoSala: this.codigoSala,
                tipoPartida: this.tipoPartida,
                estadoPartida: 'error',
                mensajeError: 'Error al obtener estado de la partida',
                errorDetail: error.message,
                // Devolvemos información básica para permitir que el cliente intente reconectarse
                equipos: [],
                jugadores: this.jugadores?.map(j => ({
                    id: j.id,
                    nombreUsuario: j.nombreUsuario,
                    equipoId: j.equipoId,
                    cartasMano: null,
                    estadoConexion: j.estadoConexion
                })) || []
            };
        }
    }
    
    persistirEstadoPartida() {
        if (this.persistirPartida) {
            const estadoParaDB = {
                codigo_sala: this.codigoSala,
                estado_partida: this.estadoPartida,
                tipo_partida: this.tipoPartida,
                puntos_objetivo: this.puntosVictoria,
                ronda_actual_numero: this.numeroRondaActual,
                jugador_mano_ronda_id: this.rondaActual ? this.rondaActual.jugadorManoRonda.id : null,
                jugador_turno_id: this.rondaActual && this.rondaActual.turnoHandler.jugadorTurnoActual ? 
                                 this.rondaActual.turnoHandler.jugadorTurnoActual.id : null,
                estado_envido: this.rondaActual ? JSON.stringify(this.rondaActual.envidoHandler.getEstado()) : null,
                estado_truco: this.rondaActual ? JSON.stringify(this.rondaActual.trucoHandler.getEstado()) : null,
                truco_pendiente_por_envido_primero: this.rondaActual ? this.rondaActual.trucoPendientePorEnvidoPrimero : false,
            };
            
            this.persistirPartida(this.idEnDB, estadoParaDB);
        }
    }

    // Método para manejar reconexiones de jugadores
    manejarReconexionJugador(jugadorId) {
        const jugador = this.jugadores.find(j => j.id === jugadorId);
        if (jugador) {
            jugador.estadoConexion = 'conectado';
            console.log(`Jugador ${jugador.nombreUsuario} reconectado a la partida ${this.codigoSala}.`);
            this._notificarEstadoGlobalActualizado('jugador_reconectado', { jugadorId });
            this.persistirEstadoPartida(); // Actualizar estado en DB
            return this.obtenerEstadoGlobalParaCliente(jugadorId); // Devolver estado completo al jugador
        }
        return null;
    }

    // Método para manejar desconexiones
    manejarDesconexionJugador(jugadorId) {
        const jugador = this.jugadores.find(j => j.id === jugadorId);
        if (jugador) {
            jugador.estadoConexion = 'desconectado';
            console.log(`Jugador ${jugador.nombreUsuario} desconectado de la partida ${this.codigoSala}.`);
            // Aquí podrías implementar lógica de pausa o finalización si todos se desconectan.
            this._notificarEstadoGlobalActualizado('jugador_desconectado', { jugadorId });
            this.persistirEstadoPartida();
        }
    }
}

module.exports = PartidaGame;