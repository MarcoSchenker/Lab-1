import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
// Asegúrate de importar AccionesPosibles y Canto desde types.ts
import { AccionesPosibles, Canto, Equipo } from './types';
import { UIHandler } from './ui';

export class Partida {
    public equipoPrimero: Equipo; // Humano
    public equipoSegundo: Equipo; // IA
    public limitePuntaje: number = 15; // Default, puede cambiar
    private ui: UIHandler;
    private debugMode: boolean = false;
    private partidaTerminada: boolean = false;
    // Añadir propiedad para mantener referencia a la ronda actual
    private rondaActual: Ronda | null = null;

    constructor(uiHandler: UIHandler, debug: boolean = false) {
        this.ui = uiHandler;
        this.debugMode = debug;

        // Inicializar equipos (igual que antes)
        // Asegúrate que las propiedades coincidan con la interfaz Equipo
        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: true, manosGanadasRonda: 0 };
    }

    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 15): void {
        this.partidaTerminada = false;
        this.limitePuntaje = limite;

        // Crear jugadores (igual que antes)
        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true);
        this.equipoSegundo.jugador = new IA(nombreJugadorDos);

        // Resetear puntajes (igual que antes)
        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        // Configurar UI inicial (igual que antes)
        this.ui.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.ui.updateScores(0, 0);
        this.ui.clearLog(); // Es buena idea limpiar el log al iniciar
        this.ui.displayLog("== Partida Iniciada ==");

        // --- Conectar acciones de la UI ---
        // Hacemos esto una vez al iniciar la partida.
        // Los callbacks llamarán a los métodos de this.rondaActual si existe.
        this.bindUIActions();
        // ----------------------------------

        // Iniciar la primera ronda
        this.continuar();
    }

    /** Conecta los eventos de la UI a los handlers de la ronda actual */
    private bindUIActions(): void {
        this.ui.bindPlayerActions({
            onPlayCard: (index: number) => {
                // Llama al handler en la ronda actual, verificando que exista
                // y pasando el índice numérico
                this.rondaActual?.handleHumanPlayCard(index);
            },
            onCantoEnvido: (canto: Canto) => {
                // Todos los cantos y respuestas humanas pueden ir a handleHumanCanto
                this.rondaActual?.handleHumanCanto(canto);
            },
            onCantoTruco: (canto: Canto) => {
                this.rondaActual?.handleHumanCanto(canto);
            },
            onResponseQuiero: () => {
                this.rondaActual?.handleHumanCanto(Canto.Quiero);
            },
            onResponseNoQuiero: () => {
                this.rondaActual?.handleHumanCanto(Canto.NoQuiero);
            },
            onIrAlMazo: () => {
                this.rondaActual?.handleHumanCanto(Canto.IrAlMazo);
            }
        });

         // También vinculamos controles de configuración si no se hace en otro lado
         this.ui.bindSetupControls({
              onNameChange: (newName) => {
                  if (this.equipoPrimero.jugador) {
                       this.equipoPrimero.jugador.nombre = newName;
                       // Actualizar nombre en UI si es necesario (aunque blur ya lo hace)
                       // this.ui.updatePlayerNames(newName, this.equipoSegundo.jugador.nombre);
                  }
              },
              onDebugToggle: (enabled) => {
                   this.setDebugMode(enabled);
              },
              onLimitePuntosChange: (limite) => {
                   this.setLimitePuntaje(limite);
              }
         });
    }

    /** Inicia la siguiente ronda o termina la partida */
    public continuar(): void {
        if (this.partidaTerminada) {
            console.log("La partida ya ha terminado.");
            return;
        }

        // Verificar si alguien ganó la partida (igual que antes)
        if (this.equipoPrimero.puntos >= this.limitePuntaje || this.equipoSegundo.puntos >= this.limitePuntaje) {
            this.finalizarPartida();
            return;
        }

        // Actualizar UI con puntajes actuales (igual que antes)
        this.ui.updateScores(this.equipoPrimero.puntos, this.equipoSegundo.puntos);

        // Alternar quién es mano (igual que antes)
        const tempMano = this.equipoPrimero.esMano;
        this.equipoPrimero.esMano = this.equipoSegundo.esMano;
        this.equipoSegundo.esMano = tempMano;

        // Crear e iniciar la nueva ronda
        const nuevaRonda = new Ronda(
            this.equipoPrimero,
            this.equipoSegundo,
            this.ui,
            // El callback se pasa igual
            (puntosEq1, puntosEq2) => this.onRondaTerminadaCallback(puntosEq1, puntosEq2),
            this.limitePuntaje,
            this.debugMode
        );
        // Asignar la nueva ronda a la propiedad de la partida
        this.rondaActual = nuevaRonda;
        // Iniciar la ronda
        this.rondaActual.iniciar();
    }

    /** Callback que se ejecuta cuando una ronda termina */
    private onRondaTerminadaCallback(puntosEq1: number, puntosEq2: number): void {
        // Actualizar puntos (igual que antes)
        this.equipoPrimero.puntos += puntosEq1;
        this.equipoSegundo.puntos += puntosEq2;
        // Marcar que la ronda terminó
        this.rondaActual = null;

        // Log (igual que antes)
        if (this.debugMode) {
             this.ui.displayLog(`Debug: Fin Ronda Callback. Pts E1=${puntosEq1}, Pts E2=${puntosEq2}. Total E1=${this.equipoPrimero.puntos}, Total E2=${this.equipoSegundo.puntos}`);
        }

        // Llamar a continuar DESPUÉS de un breve retraso para que la UI se actualice
        // y se vea el final de la ronda.
        setTimeout(() => {
             this.continuar();
        }, 500); // Ajusta el tiempo si es necesario
    }

    private finalizarPartida(): void {
        this.partidaTerminada = true;
        // Asegurarse que no hay referencia a una ronda activa
        this.rondaActual = null;

        // --- Actualizar llamada para deshabilitar botones ---
        // Crear un objeto AccionesPosibles con todo deshabilitado
        const accionesDeshabilitadas: AccionesPosibles = {
             puedeJugarCarta: false,
             puedeCantarEnvido: [],
             puedeCantarTruco: [],
             puedeResponder: [],
             puedeMazo: false
        };
        // Llamar al nuevo método de UIHandler
        this.ui.actualizarAccionesPosibles(accionesDeshabilitadas);
        // --------------------------------------------------

        // Log de fin de partida (igual que antes)
        const ganador = this.equipoPrimero.puntos >= this.limitePuntaje ? this.equipoPrimero : this.equipoSegundo;
        const perdedor = ganador === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;

        this.ui.displayLog("=======================");
        this.ui.displayLog(`¡PARTIDA TERMINADA!`);
        this.ui.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`);
        this.ui.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`);
        this.ui.displayLog("=======================");
    }

    // Métodos setLimitePuntaje y setDebugMode (igual que antes)
    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = limite;
        this.ui.displayLog(`Límite de puntaje cambiado a: ${limite}`);
    }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
        this.ui.displayLog(`Modo Debug: ${activado ? 'Activado' : 'Desactivado'}`);
        // Nota: Cambiar debugMode aquí no afectará a la ronda que ya está en curso
        // a menos que agregues un método a Ronda para actualizarlo.
    }
}