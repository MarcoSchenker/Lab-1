import { Ronda, EstadoRonda } from './ronda';
import { IA } from './ia';
import { Equipo, Canto } from './types';
import { EnvidoContext } from './ia-context';
import * as Calculos from './ronda-calculos';
import * as Actions from './ronda-actions';
import { getLast } from './utils';
import { Naipe } from './naipe';

 export class RondaEnvidoHandler {
     private ronda: Ronda; // Ahora usa la interfaz

     public cantosEnvido: { canto: Canto; equipo: Equipo }[] = [];
     public equipoDebeResponderEnvido: Equipo | null = null;
     public envidoResuelto: boolean = false;
     public puedeEnvido: boolean = true;

     constructor(ronda: Ronda) {
         this.ronda = ronda;
     }

     public nuevaRonda(): void {
         this.cantosEnvido = [];
         this.equipoDebeResponderEnvido = null;
         this.envidoResuelto = false;
         this.puedeEnvido = true;
         this.ronda.equipoPrimero.jugador.puntosGanadosEnvidoRonda = 0;
         this.ronda.equipoSegundo.jugador.puntosGanadosEnvidoRonda = 0;
     }

     public puedeCantar(): boolean {
         if (
             !this.puedeEnvido ||
             this.envidoResuelto ||
             this.equipoDebeResponderEnvido ||
             this.ronda.trucoHandler.equipoDebeResponderTruco
         )
             return false;
         if (this.ronda.numeroDeMano !== 0) return false;
         if (this.ronda.equipoEnTurno === this.ronda.equipoMano && this.ronda.jugadasEnMano > 0)
             return false;
         if (this.ronda.equipoEnTurno === this.ronda.equipoPie && this.ronda.jugadasEnMano > 1)
             return false;

         return true;
     }

     public getPosiblesCantos(): Canto[] {
         if (!this.puedeCantar) return [];
         return Actions.getPosiblesCantosEnvido(this.ronda);
     }

     public getPosiblesRespuestas(): Canto[] {
         if (!this.equipoDebeResponderEnvido || this.ronda.equipoEnTurno !== this.equipoDebeResponderEnvido)
             return [];
         return Actions.getPosiblesRespuestasEnvido(this.ronda);
     }

     public registrarCanto(canto: Canto, equipoQueCanta: Equipo): boolean {
         if (!this.getPosiblesCantos().includes(canto)) {
             this.logDebug(`Canto Envido inválido ${canto} intentado por ${equipoQueCanta.jugador.nombre}`);
             return false;
         }

         this.ronda.callbacks.showPlayerCall(equipoQueCanta.jugador, this.ronda.cantoToString(canto));
         this.cantosEnvido.push({ canto, equipo: equipoQueCanta });

         this.equipoDebeResponderEnvido = this.ronda.getOponente(equipoQueCanta);
         this.ronda.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
         this.ronda.equipoEnTurno = this.equipoDebeResponderEnvido;
         console.log("[registrarCanto] equipoDebeResponderEnvido:", this.equipoDebeResponderEnvido?.jugador.nombre);
         console.log("[registrarCanto] estadoRonda:", this.ronda.estadoRonda);
         console.log("[registrarCanto] equipoEnTurno:", this.ronda.equipoEnTurno?.jugador.nombre);

         return true;
     }

     public registrarRespuesta(respuesta: Canto, equipoQueResponde: Equipo): boolean {
         // LOG para depuración
         console.log("[registrarRespuesta] equipoDebeResponderEnvido:", this.equipoDebeResponderEnvido?.jugador.nombre);
         console.log("[registrarRespuesta] equipoQueResponde:", equipoQueResponde.jugador.nombre);
         console.log("[registrarRespuesta] respuesta:", respuesta);

         if (
             equipoQueResponde !== this.equipoDebeResponderEnvido ||
             !this.getPosiblesRespuestas().includes(respuesta)
         ) {
             this.logDebug(
                 `Respuesta Envido inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`
             );
             return false;
         }

         this.ronda.callbacks.showPlayerCall(equipoQueResponde.jugador, this.ronda.cantoToString(respuesta));
         this.cantosEnvido.push({ canto: respuesta, equipo: equipoQueResponde });
         this.equipoDebeResponderEnvido = null;

         const esRespuestaFinal = respuesta === Canto.Quiero || respuesta === Canto.NoQuiero;

         if (esRespuestaFinal) {
             this.resolverEnvido(respuesta === Canto.Quiero, equipoQueResponde);
             this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
             this.setTurnoPostEnvido(respuesta); // Usar método refactorizado
         } else {
             // CORRECCIÓN: Setear correctamente el equipo que debe responder y loguear
             this.equipoDebeResponderEnvido = this.ronda.getOponente(equipoQueResponde);
             this.ronda.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
             this.ronda.equipoEnTurno = this.equipoDebeResponderEnvido;

             // LOG para depuración
             console.log("[registrarRespuesta] Nuevo equipoDebeResponderEnvido:", this.equipoDebeResponderEnvido?.jugador.nombre);
             console.log("[registrarRespuesta] estadoRonda:", this.ronda.estadoRonda);
             console.log("[registrarRespuesta] equipoEnTurno:", this.ronda.equipoEnTurno?.jugador.nombre);
         }
         return true;
     }

     private resolverEnvido(querido: boolean, equipoQueRespondio: Equipo): void {
         this.envidoResuelto = true;

         const puntosCalculados = Calculos.calcularPuntosEnvido(
             this.cantosEnvido,
             this.ronda.limitePuntaje,
             this.ronda.equipoPrimero.puntos,
             this.ronda.equipoSegundo.puntos
         );
         let equipoGanador: Equipo | null = null;
         let puntosOtorgados = 0;

         if (querido) {
             const pMano = this.ronda.equipoMano.jugador.getPuntosDeEnvido(
                 this.ronda.equipoMano.jugador.cartas
             );
             const pPie = this.ronda.equipoPie.jugador.getPuntosDeEnvido(
                 this.ronda.equipoPie.jugador.cartas
             );

             this.ronda.callbacks.showPlayerCall(this.ronda.equipoMano.jugador, `${this.ronda.cantoToString(pMano)}`);
             setTimeout(() => {
                 this.ronda.callbacks.showPlayerCall(
                     this.ronda.equipoPie.jugador,
                     `${this.ronda.cantoToString(pPie)}`
                 );
             }, 600);

             equipoGanador = pMano >= pPie ? this.ronda.equipoMano : this.ronda.equipoPie;
             puntosOtorgados = puntosCalculados.ganador;

             const equipoPerdedor = this.ronda.getOponente(equipoGanador);
             if (!equipoPerdedor.jugador.esHumano && equipoPerdedor.jugador instanceof IA) {
                 const puntosGanador = equipoGanador === this.ronda.equipoMano ? pMano : pPie;
                 (equipoPerdedor.jugador as IA).statsEnvido(this.cantosEnvido, puntosGanador);
             }
         } else {
             const ultimoCantoObj = getLast(
                 this.cantosEnvido.filter(c => !this.ronda.esRespuesta(c.canto))
             );
             if (ultimoCantoObj) {
                 equipoGanador = ultimoCantoObj.equipo;
                 puntosOtorgados = puntosCalculados.perdedor;
             } else {
                 this.logDebug('Envido No Querido sin canto previo?');
                 puntosOtorgados = 0;
             }
         }

         if (equipoGanador && puntosOtorgados > 0) {
             this.logPublic(`Envido: Gana ${puntosOtorgados}pts ${equipoGanador.jugador.nombre}`);
             equipoGanador.jugador.puntosGanadosEnvidoRonda = puntosOtorgados;
         }
         this.puedeEnvido = false;
     }

     public onCartaJugada(): void {
         if (
             this.ronda.numeroDeMano === 0 &&
             this.ronda.jugadasEnMano >= 1 &&
             this.puedeEnvido &&
             !this.envidoResuelto
         ) {
             this.puedeEnvido = false;
             if (this.ronda.debugMode) this.logDebug('Debug: Envido perdido (se jugó la primera carta).');
             this.envidoResuelto = true;
         }
     }

     public crearContextoEnvido(ia: IA): EnvidoContext {
         const equipoIA = this.ronda.getEquipo(ia)!;
         const oponente = this.ronda.getOponente(equipoIA);

         const puntosCalculados = Calculos.calcularPuntosEnvido(
             this.cantosEnvido,
             this.ronda.limitePuntaje,
             this.ronda.equipoPrimero.puntos,
             this.ronda.equipoSegundo.puntos
         );

         const cartaVistaOponente: Naipe | null = this.ronda.turnoHandler.getUltimaCartaJugadaPor(
             oponente
         );

         //  TODO: Implementar extracción de stats del oponente (IA o Humano)
         let statsOponente: any = { envidoS: [], revire: [], realEnvido: [], faltaEnvido: [] };
         if (oponente.jugador instanceof IA) {
            const oponenteIA = oponente.jugador as IA;
            statsOponente = {
                envidoS: oponenteIA.envidoS ?? [],
                revire: oponenteIA.revire ?? [],
                realEnvido: oponenteIA.realEnvido ?? [],
                faltaEnvido: oponenteIA.faltaEnvido ?? [],
            };
         } else {
             statsOponente = { };
         }

         return {
             equipoIA: equipoIA,
             oponente: oponente,
             limitePuntaje: this.ronda.limitePuntaje,
             misPuntosEnvido: ia.getPuntosDeEnvido(ia.cartas),
             ultimoCantoEnvido: getLast(
                 this.cantosEnvido.filter(c => !this.ronda.esRespuesta(c.canto))
             )?.canto ?? null,
             puntosEnvidoAcumulados: puntosCalculados.ganador,
             puntosSiNoQuiero: puntosCalculados.perdedor,
             cartaVistaOponente: cartaVistaOponente,
             statsEnvidoOponente: statsOponente,
             probabilidad: {
                 ponderarPuntos: ia.prob.ponderarPuntos.bind(ia.prob),
                 evaluarCartaVista: ia.prob.evaluarCartaVista.bind(ia.prob),
                 medianaEnvidoOponente: ia.prob.medianaEnvidoOponente.bind(ia.prob),
             },
             esIAManoDeRonda: equipoIA.esMano,
             historialEnvido: this.cantosEnvido,
         };
     }

     // --- Métodos de Log ---
     private logDebug(mensaje: string): void {
         this.ronda.callbacks.displayLog(`EnvidoHandler: ${mensaje}`, 'debug');
     }

     private logPublic(mensaje: string): void {
         this.ronda.callbacks.displayLog(mensaje, 'public');
     }

     // --- Métodos Refactorizados ---

     /** Determina el turno después de resolver el envido */
     private setTurnoPostEnvido(respuesta: Canto): void {
         const ultimoCantadorNoRespuesta = getLast(
             this.cantosEnvido.filter(c => !this.ronda.esRespuesta(c.canto))
         )?.equipo;
         if (ultimoCantadorNoRespuesta) {
             this.ronda.equipoEnTurno = ultimoCantadorNoRespuesta;
         } else {
             this.ronda.equipoEnTurno = this.ronda.equipoMano; // Fallback
         }
     }
 }