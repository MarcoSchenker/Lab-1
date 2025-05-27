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
        console.log(`Configurando partida ${this.codigoSala} para ${this.tipoPartida} a ${this.puntosVictoria} puntos.`);
        // 1. Crear Jugadores
        jugadoresInfo.forEach(info => {
            this.jugadores.push(new JugadorGame(info.id, info.nombre_usuario, null)); // equipoId se asigna después
        });

        // 2. Crear Equipos y Asignar Jugadores
        this._asignarJugadoresAEquipos(); // Implementar esta lógica

        // 3. Determinar el primer mano de la partida (puede ser el primer jugador o aleatorio)
        this.indiceJugadorManoGlobal = 0; // Por simplicidad, el primer jugador en la lista global

        this.estadoPartida = 'en_juego';
        this.iniciarNuevaRonda();
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
        if (this.estadoPartida !== 'en_juego') return;

        this.numeroRondaActual++;
        const jugadorManoDeEstaRonda = this.jugadores[this.indiceJugadorManoGlobal];
        
        this._determinarOrdenJuegoRonda(jugadorManoDeEstaRonda);

        console.log(`Partida ${this.codigoSala}: Iniciando ronda ${this.numeroRondaActual}. Mano global: ${jugadorManoDeEstaRonda.nombreUsuario}`);

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
        
        this._notificarEstadoGlobalActualizado('nueva_ronda_iniciada');
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
        if (this.notificarEstadoGlobal) {
            const estadoGlobal = this.obtenerEstadoGlobalParaCliente();
            this.notificarEstadoGlobal(this.codigoSala, eventoRaiz, { ...estadoGlobal, ...detalleEventoRaiz });
        }
    }

    obtenerEstadoGlobalParaCliente(solicitanteJugadorId = null) {
        // Construye el objeto de estado completo para enviar a los clientes.
        // Debe incluir información de la partida, equipos, jugadores (con cartas filtradas),
        // y el estado de la ronda actual.
        let estadoGlobal = {
            codigoSala: this.codigoSala,
            tipoPartida: this.tipoPartida,
            puntosVictoria: this.puntosVictoria,
            estadoPartida: this.estadoPartida,
            equipos: this.equipos.map(e => ({
                id: e.id,
                nombre: e.nombre,
                puntosPartida: e.puntosPartida,
                jugadoresIds: e.jugadores.map(j => j.id)
            })),
            jugadores: this.jugadores.map(j => ({
                id: j.id,
                nombreUsuario: j.nombreUsuario,
                equipoId: j.equipoId,
                esPie: j.esPie,
                // Enviar cartas solo al jugador solicitante o si la partida terminó (para revisión)
                cartasMano: (solicitanteJugadorId === j.id || this.estadoPartida === 'finalizada') ? j.cartasMano.map(c=>({...c})) : null,
                cartasJugadasRonda: j.cartasJugadasRonda.map(c=>({...c})),
                estadoConexion: j.estadoConexion,
            })),
            numeroRondaActual: this.numeroRondaActual,
            indiceJugadorManoGlobal: this.indiceJugadorManoGlobal, // Quién será mano en la siguiente ronda
            estadoRondaActual: this.rondaActual ? this.rondaActual.obtenerEstadoRonda() : null,
            historialRondas: this.historialRondas,
            // Información adicional que el cliente necesite
            
            // Estado de la ronda actual
            rondaActual: {
                numeroRonda: this.numeroRondaActual,
                jugadorManoId: this.rondaActual ? this.rondaActual.jugadorManoRonda.id : null,
                ganadorRondaEquipoId: this.rondaActual ? this.rondaActual.ganadorRondaEquipoId : null,
                turnoInfo: this.rondaActual ? this.rondaActual.turnoHandler.getEstado() : null,
                envidoInfo: this.rondaActual ? this.rondaActual.envidoHandler.getEstado() : null,
                trucoInfo: this.rondaActual ? this.rondaActual.trucoHandler.getEstado() : null,
                trucoPendientePorEnvidoPrimero: this.rondaActual ? this.rondaActual.trucoPendientePorEnvidoPrimero : false
            }
        };
        
        return estadoGlobal;
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