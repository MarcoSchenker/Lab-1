import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
import { Equipo } from './types';
import { UIHandler } from './ui';

export class Partida {
    public equipoPrimero: Equipo; // Humano
    public equipoSegundo: Equipo; // IA
    public limitePuntaje: number = 15; // Default, puede cambiar
    private ui: UIHandler;
    private debugMode: boolean = false;
    private partidaTerminada: boolean = false;

    constructor(uiHandler: UIHandler, debug: boolean = false) {
        this.ui = uiHandler;
        this.debugMode = debug;

        // Inicializar equipos vacíos inicialmente
        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manos: 0 };
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: true, manos: 0 }; // Empieza siendo mano la IA (arbitrario)
    }

    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 15): void {
        this.partidaTerminada = false;
        this.limitePuntaje = limite;

        // Crear jugadores
        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true);
        this.equipoSegundo.jugador = new IA(nombreJugadorDos);

        // Resetear puntajes
        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        // Configurar UI inicial
        this.ui.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.ui.updateScores(0, 0);
        this.ui.displayLog("== Partida Iniciada ==");

        // Iniciar la primera ronda
        this.continuar();
    }

    /** Inicia la siguiente ronda o termina la partida */
    public continuar(): void {
        if (this.partidaTerminada) {
            console.log("La partida ya ha terminado.");
            return;
        }

        // Verificar si alguien ganó la partida
        if (this.equipoPrimero.puntos >= this.limitePuntaje || this.equipoSegundo.puntos >= this.limitePuntaje) {
            this.finalizarPartida();
            return;
        }

        // Actualizar UI con puntajes actuales
        this.ui.updateScores(this.equipoPrimero.puntos, this.equipoSegundo.puntos);

        // Alternar quién es mano para la nueva ronda
        const tempMano = this.equipoPrimero.esMano;
        this.equipoPrimero.esMano = this.equipoSegundo.esMano;
        this.equipoSegundo.esMano = tempMano;

        // Crear e iniciar la nueva ronda
        // Pasar el método onRondaTerminada como callback usando una función flecha para mantener el contexto 'this'
        const ronda = new Ronda(
            this.equipoPrimero,
            this.equipoSegundo,
            this.ui,
            (puntosEq1, puntosEq2) => this.onRondaTerminadaCallback(puntosEq1, puntosEq2), // Callback
            this.limitePuntaje,
            this.debugMode
        );
        ronda.iniciar();
    }

    /** Callback que se ejecuta cuando una ronda termina */
    private onRondaTerminadaCallback(puntosEq1: number, puntosEq2: number): void {
        this.equipoPrimero.puntos += puntosEq1;
        this.equipoSegundo.puntos += puntosEq2;

        if (this.debugMode) {
             this.ui.displayLog(`Debug: Fin Ronda Callback. Pts E1=${puntosEq1}, Pts E2=${puntosEq2}. Total E1=${this.equipoPrimero.puntos}, Total E2=${this.equipoSegundo.puntos}`);
        }

        // Llamar a continuar para verificar fin de partida o iniciar nueva ronda
        this.continuar();
    }

    private finalizarPartida(): void {
        this.partidaTerminada = true;
        this.ui.setButtonState([], [], false); // Deshabilitar botones

        const ganador = this.equipoPrimero.puntos >= this.limitePuntaje ? this.equipoPrimero : this.equipoSegundo;
        const perdedor = ganador === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;

        this.ui.displayLog("=======================");
        this.ui.displayLog(`¡PARTIDA TERMINADA!`);
        this.ui.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`);
        this.ui.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`);
        this.ui.displayLog("=======================");

        // Podrías añadir un botón para "Jugar de nuevo" que llame a this.iniciar()
    }

    // Método para actualizar el límite de puntos (llamado desde UI)
    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = limite;
        this.ui.displayLog(`Límite de puntaje cambiado a: ${limite}`);
    }

     // Método para actualizar modo debug (llamado desde UI)
    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
         this.ui.displayLog(`Modo Debug: ${activado ? 'Activado' : 'Desactivado'}`);
    }
}