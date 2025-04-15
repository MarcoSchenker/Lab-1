import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
// Asegúrate de importar AccionesPosibles y Canto desde types.ts
import { AccionesPosibles, Canto, Equipo } from './types';
import { GameCallbacks } from '../game-callbacks';

export class Partida {
    public equipoPrimero: Equipo; // Humano
    public equipoSegundo: Equipo; // IA
    public limitePuntaje: number = 30; // Default, puede cambiar
    private callbacks: GameCallbacks;
    private debugMode: boolean = false;
    private partidaTerminada: boolean = false;
    // Añadir propiedad para mantener referencia a la ronda actual
    private rondaActual: Ronda | null = null;

    constructor(gameCallbacks: GameCallbacks, debug: boolean = false) {
        this.callbacks = gameCallbacks;
        this.debugMode = debug;

        // Inicializar equipos (igual que antes)
        // Asegúrate que las propiedades coincidan con la interfaz Equipo
        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: true, manosGanadasRonda: 0 };
    }

    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 30): void {
        this.partidaTerminada = false;
        this.limitePuntaje = limite;

        // Crear jugadores (igual que antes)
        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true);
        this.equipoSegundo.jugador = new IA(nombreJugadorDos);

        // Resetear puntajes (igual que antes)
        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        // Notificar a la UI el estado inicial
        this.callbacks.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.callbacks.updateScores(0, 0);
        this.callbacks.clearLog();
        this.callbacks.displayLog("== Partida Iniciada ==");

        // ----------------------------------

        // Iniciar la primera ronda
        this.continuar();
    }

    /** Inicia la siguiente ronda o finaliza la partida si se alcanzó el límite */
    public continuar(): void {
        if (this.partidaTerminada) {
            console.warn("Intento de continuar una partida ya terminada.");
            return;
        }

        // Verificar si la partida terminó
        if (this.equipoPrimero.puntos >= this.limitePuntaje || this.equipoSegundo.puntos >= this.limitePuntaje) {
            this.finalizarPartida();
            return;
        }

        // Actualizar puntajes en la UI
        this.callbacks.updateScores(this.equipoPrimero.puntos, this.equipoSegundo.puntos);

        // Alternar quién es mano para la nueva ronda
        const tempMano = this.equipoPrimero.esMano;
        this.equipoPrimero.esMano = this.equipoSegundo.esMano;
        this.equipoSegundo.esMano = tempMano;

        // Crear e iniciar la nueva ronda, pasando los callbacks
        const nuevaRonda = new Ronda(
            this.equipoPrimero,
            this.equipoSegundo,
            this.callbacks, // Pasar los callbacks a la ronda
            (puntosEq1, puntosEq2) => this.onRondaTerminadaCallback(puntosEq1, puntosEq2),
            this.limitePuntaje,
            this.debugMode
        );
        this.rondaActual = nuevaRonda;
        this.rondaActual.iniciar(); // La ronda usará los callbacks para interactuar con la UI
    }

    /** Callback llamado por la Ronda cuando termina */
    private onRondaTerminadaCallback(puntosEq1: number, puntosEq2: number): void {
        this.equipoPrimero.puntos += puntosEq1;
        this.equipoSegundo.puntos += puntosEq2;
        this.rondaActual = null; // La ronda ya no está activa

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: Fin Ronda. Puntos Ronda: E1=${puntosEq1}, E2=${puntosEq2}. Total: E1=${this.equipoPrimero.puntos}, E2=${this.equipoSegundo.puntos}`);
        }

        // Pausa breve antes de continuar para que se vea el resultado de la ronda
        setTimeout(() => {
            this.continuar();
        }, 1500); // Ajusta el delay si es necesario
    }

    /** Finaliza la partida y notifica a la UI */
    private finalizarPartida(): void {
        this.partidaTerminada = true;
        this.rondaActual = null;

        // Notificar a la UI que la partida terminó y deshabilitar acciones
        const accionesDeshabilitadas: AccionesPosibles = {
            puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false
        };
        this.callbacks.actualizarAccionesPosibles(accionesDeshabilitadas);
        this.callbacks.setPartidaTerminada(); // Informar al estado de React

        // Determinar ganador y perdedor
        const ganador = this.equipoPrimero.puntos >= this.limitePuntaje ? this.equipoPrimero : this.equipoSegundo;
        const perdedor = ganador === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;

        // Mostrar resultado final en el log
        this.callbacks.displayLog("=======================");
        this.callbacks.displayLog(`¡PARTIDA TERMINADA!`);
        this.callbacks.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`);
        this.callbacks.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`);
        this.callbacks.displayLog("=======================");

        // Opcional: Limpiar cartas de la UI al final
         this.callbacks.displayPlayerCards(this.equipoPrimero.jugador); // Mostrar mano vacía
         this.callbacks.clearPlayedCards();
    }

    // --- Métodos para ser llamados por la UI (React) ---

    /**
     * Procesa la acción del jugador humano de jugar una carta.
     * @param index El índice de la carta en la mano del jugador.
     */
    public handleHumanPlayCard(index: number): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanPlayCard(index); // Delega a la ronda activa
        } else {
            console.warn("Intento de jugar carta sin ronda activa o partida terminada.");
            this.callbacks.displayLog("Error: No se puede jugar ahora."); // Informar al usuario
        }
    }

    /**
     * Procesa la acción del jugador humano de realizar un canto o respuesta.
     * @param canto El Canto realizado.
     */
    public handleHumanCanto(canto: Canto): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanCanto(canto); // Delega a la ronda activa
        } else {
            console.warn("Intento de cantar sin ronda activa o partida terminada.");
             this.callbacks.displayLog("Error: No se puede cantar ahora."); // Informar al usuario
        }
    }

    // --- Métodos de Configuración ---

    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = limite;
        this.callbacks.displayLog(`Límite de puntaje cambiado a: ${limite}`);
        // Nota: Este cambio solo afectará a las próximas rondas si se llama antes de `iniciar`.
    }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
        this.callbacks.displayLog(`Modo Debug: ${activado ? 'Activado' : 'Desactivado'}`);
        // Propagar a la ronda actual si existe
        if (this.rondaActual) {
            this.rondaActual.setDebugMode(activado);
        }
    }

    // Método de utilidad si React necesita info de la ronda
    public getRondaActual(): Ronda | null {
        return this.rondaActual;
    }
}