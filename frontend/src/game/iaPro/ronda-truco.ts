import { Ronda, EstadoRonda } from './ronda';
import { IA } from './ia';
import { Equipo, Canto } from './types';
import { TrucoContext } from './ia-context';
import * as Calculos from './ronda-calculos';
import { getLast } from './utils';
import { Naipe } from './naipe';


export class RondaTrucoHandler {
    private ronda: Ronda;
    public cantosTruco: { canto: Canto; equipo: Equipo }[] = [];
    public equipoDebeResponderTruco: Equipo | null = null;
    public trucoResuelto: boolean = false;
    public trucoNoQueridoPor: Equipo | null = null;
    public trucoQuerido: boolean = false;
    public equipoSeFueAlMazo: Equipo | null = null;
    private equipoInterrumpido: Equipo | null = null;
    

    constructor(ronda: Ronda) {
        this.ronda = ronda;
    }
 

    public nuevaRonda(): void {
        this.cantosTruco = [];
        this.equipoDebeResponderTruco = null;
        this.trucoResuelto = false;
        this.trucoNoQueridoPor = null;
        this.trucoQuerido = false;
        this.equipoSeFueAlMazo = null;
        this.equipoInterrumpido = null;
    }
    

    private puedeCantar(equipo: Equipo): boolean {
        // Check 1: Basic game states preventing any Truco interaction
        if (this.ronda.envidoHandler.equipoDebeResponderEnvido) {
            return false; // Envido has priority
        }
        if (this.trucoNoQueridoPor || this.equipoSeFueAlMazo) {
             return false;
        }
    
        if (this.equipoDebeResponderTruco === equipo) {
             return false;
        }
        const ultimoNivelObj = getLast(this.cantosTruco.filter(c => !this.ronda.esRespuesta(c.canto)));
        const ultimoNivel = ultimoNivelObj?.canto;
        if (ultimoNivel === Canto.ValeCuatro && this.trucoQuerido) {
             return false; // Cannot escalate V4 if accepted
        }
        const ultimoCantoGeneralObj = getLast(this.cantosTruco);
        if (ultimoCantoGeneralObj && !this.ronda.esRespuesta(ultimoCantoGeneralObj.canto) && ultimoCantoGeneralObj.equipo === equipo) {
             return false; // Cannot sing again if waiting for opponent's response to my call
        }
        return true;
    }
    

    public getPosiblesCantos(): Canto[] {
        const equipoActual = this.ronda.equipoEnTurno;
        if (!this.puedeCantar(equipoActual)) return [];
        const ultimoCantoRealObj = getLast(
        this.cantosTruco.filter(c => !this.ronda.esRespuesta(c.canto))
        );
        const ultimoCantoReal = ultimoCantoRealObj?.canto;
        if (!ultimoCantoReal) return [Canto.Truco];
        const ultimoCantoGeneralObj = getLast(this.cantosTruco);
        
        if (ultimoCantoGeneralObj?.canto === Canto.Quiero && ultimoCantoGeneralObj.equipo === equipoActual) {
            switch (ultimoCantoReal) {
                case Canto.Truco:
                    return [Canto.ReTruco];
                case Canto.ReTruco:
                    return [Canto.ValeCuatro];
            }
        }
        return [];
    }
    

    public getPosiblesRespuestas(): Canto[] {
        const equipoActual = this.ronda.equipoEnTurno;
        if (!this.equipoDebeResponderTruco || equipoActual !== this.equipoDebeResponderTruco) return [];
    
        const ultimoCantoRealObj = getLast( this.cantosTruco.filter(c => !this.ronda.esRespuesta(c.canto)));
        const ultimoCantoReal = ultimoCantoRealObj?.canto;
        
        const respuestasBase: Canto[] = [Canto.Quiero, Canto.NoQuiero];
        if (!ultimoCantoReal) return [];
        
        switch (ultimoCantoReal) {
            case Canto.Truco:
                respuestasBase.push(Canto.ReTruco);
                break;
            case Canto.ReTruco:
                respuestasBase.push(Canto.ValeCuatro);
                break;
        }
        return respuestasBase;
    }
    

    public registrarCanto(canto: Canto, equipoQueCanta: Equipo): boolean {
        if (!this.getPosiblesCantos().includes(canto)) {
            this.logDebug(`Canto Truco inválido ${canto} intentado por ${equipoQueCanta.jugador.nombre}`);
            return false;
        }
            // --- Determinar si se interrumpe un turno de juego ---
        const estabaEsperandoJugada = this.ronda.estadoRonda === EstadoRonda.EsperandoJugadaNormal || this.ronda.estadoRonda === EstadoRonda.InicioMano;
        const esTurnoDelCantador = equipoQueCanta === this.ronda.equipoEnTurno;

        this.ronda.callbacks.showPlayerCall(equipoQueCanta.jugador, this.ronda.cantoToString(canto));
        this.cantosTruco.push({ canto, equipo: equipoQueCanta });
        this.equipoDebeResponderTruco = this.ronda.getOponente(equipoQueCanta);
        this.ronda.envidoHandler.equipoDebeResponderEnvido = null; // Limpiar estado de envido

        // --- Guardar jugador interrumpido SI CORRESPONDE ---
        if (estabaEsperandoJugada && esTurnoDelCantador) {
            this.equipoInterrumpido = equipoQueCanta; // Recordar quién debe jugar después
        } else {
            // Si el canto NO interrumpió (ej: se cantó justo después de que el otro jugó), no hay interrumpido.
            this.equipoInterrumpido = null;
        }

        this.ronda.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
        // El turno AHORA es para RESPONDER al canto
        this.ronda.equipoEnTurno = this.equipoDebeResponderTruco;

        return true;
    }
    
    

    public registrarRespuesta(respuesta: Canto, equipoQueResponde: Equipo): boolean {
        if (equipoQueResponde !== this.equipoDebeResponderTruco || !this.getPosiblesRespuestas().includes(respuesta) ) {
            this.logDebug(`Respuesta Truco inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`);
            return false;
        }
        this.ronda.callbacks.showPlayerCall(equipoQueResponde.jugador, this.ronda.cantoToString(respuesta));
        this.cantosTruco.push({ canto: respuesta, equipo: equipoQueResponde });
        this.equipoDebeResponderTruco = null;
        
        const esRespuestaFinal = respuesta === Canto.Quiero || respuesta === Canto.NoQuiero;
        
        if (esRespuestaFinal) {
            this.resolverTruco(respuesta === Canto.Quiero, equipoQueResponde);
        
            if (this.trucoResuelto && this.ronda.estadoRonda !== EstadoRonda.RondaTerminada) {
            this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
            this.setTurnoPostTruco(equipoQueResponde); // Usar método refactorizado
            // --- Limpiar el estado de interrupción DESPUÉS de usarlo ---
                if (respuesta === Canto.Quiero) {
                    this.equipoInterrumpido = null;
                }
            }
        } else {
            this.equipoDebeResponderTruco = this.ronda.getOponente(equipoQueResponde);
            this.ronda.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
            this.ronda.equipoEnTurno = this.equipoDebeResponderTruco;
        }
        return true;
    }
    
    

    private resolverTruco(querido: boolean, equipoQueRespondio: Equipo): void {
        this.trucoResuelto = true;
        
        if (querido) {
            this.trucoQuerido = true;
            this.trucoNoQueridoPor = null;
            this.equipoSeFueAlMazo = null;
        } else {
            this.trucoQuerido = false;
            this.trucoNoQueridoPor = equipoQueRespondio;
            this.equipoSeFueAlMazo = null;
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
        }
    }
    

    public registrarMazo(equipoQueSeVa: Equipo): boolean {
        if (this.ronda.estadoRonda === EstadoRonda.RondaTerminada) {
        this.logDebug(`${equipoQueSeVa.jugador.nombre} intentó irse al mazo pero la ronda ya terminó.`);
        return false;
        }
        if (this.trucoQuerido){
            return false;
        }
        this.ronda.callbacks.showPlayerCall(equipoQueSeVa.jugador, this.ronda.cantoToString(Canto.IrAlMazo));
        this.cantosTruco.push({ canto: Canto.IrAlMazo, equipo: equipoQueSeVa });
        
        this.trucoResuelto = true;
        this.trucoQuerido = false;
        this.trucoNoQueridoPor = null;
        this.equipoSeFueAlMazo = equipoQueSeVa;
    
        this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
        return true;
    }
    

    public getResultadoTrucoFinal(): {
        ganador: Equipo | null;
        puntos: number;
        fueNoQuerido: boolean;
        fueMazo: boolean;
    } {
        let ganador: Equipo | null = null;
        let puntos = 0;
        const fueNoQuerido = !!this.trucoNoQueridoPor;
        const fueMazo = !!this.equipoSeFueAlMazo;

        if (fueMazo) {
            ganador = this.ronda.getOponente(this.equipoSeFueAlMazo!);
            puntos = Calculos.calcularPuntosTruco(
                this.cantosTruco.filter(c => c.canto !== Canto.IrAlMazo)
            ).noQuerido || 1;
        } else if (fueNoQuerido) {
            const ultimoCantoObj = getLast(
                this.cantosTruco.filter(c => !this.ronda.esRespuesta(c.canto))
            );
            if (ultimoCantoObj) {
                ganador = ultimoCantoObj.equipo;
                puntos = Calculos.calcularPuntosTruco(this.cantosTruco).noQuerido;
            } else {
                this.logDebug('Truco No Querido sin canto previo?');
                ganador = null;
                puntos = 0;
            }
        } else {
            ganador = this.ronda.turnoHandler.determinarGanadorRonda();
            if (ganador) {
                puntos = Calculos.calcularPuntosTruco(this.cantosTruco).querido;
            } else {
                this.logDebug('No se determinó ganador de ronda para el truco.');
                ganador = this.ronda.equipoMano;
                puntos = 1;
            }
        }

        return { ganador, puntos, fueNoQuerido, fueMazo };
    }

    public crearContextoTruco(ia: IA): TrucoContext {
        const equipoIA = this.ronda.getEquipo(ia);
        if (!equipoIA) {
            throw new Error('No se encontró el equipo de la IA para crear contexto Truco.');
        }
        const oponente = this.ronda.getOponente(equipoIA);

        // Obtener resultados de manos anteriores (si las hubo)
        const { resMano0, resMano1 } = this.ronda.turnoHandler.getResultadosManosAnteriores(equipoIA);

        // Obtener las cartas jugadas en la mano 0 (si se jugó)
        const cartasMano0 = this.ronda.turnoHandler.getCartasMano(0); // Llama al método en turnoHandler

        let cartaIA_M0: Naipe | null = null; // Inicializar como null
        let cartaOp_M0: Naipe | null = null; // Inicializar como null

        // Solo intentar acceder a las cartas si la mano 0 se jugó y se obtuvieron cartas
        if (cartasMano0) {
            // Acceder a las propiedades correctas del objeto devuelto por getCartasMano
            const cartaEq1Mano0 = cartasMano0.cartaEq1;
            const cartaEq2Mano0 = cartasMano0.cartaEq2;

            // Asignar la carta correcta a la IA y al oponente para la mano 0
            cartaIA_M0 = (equipoIA === this.ronda.equipoPrimero) ? cartaEq1Mano0 : cartaEq2Mano0;
            cartaOp_M0 = (oponente === this.ronda.equipoPrimero) ? cartaEq1Mano0 : cartaEq2Mano0;
        }

        // Obtener las cartas jugadas en la mano actual (si las hay)
        const { cartaJugadorActual, cartaOponenteActual } = this.ronda.turnoHandler.getCartasManoActual(equipoIA);

        // Calcular los puntos de envido que cantó el oponente (si el envido se quiso y ganó el oponente)
        let puntosOponenteEnvido: number | null = null;
        if (
            this.ronda.envidoHandler.envidoResuelto &&
            getLast(this.ronda.envidoHandler.cantosEnvido)?.canto === Canto.Quiero // Verificar si el último canto fue Quiero
        ) {
            const equipoGanadorEnvido =
                this.ronda.equipoPrimero.jugador.puntosGanadosEnvidoRonda > 0
                    ? this.ronda.equipoPrimero
                    : this.ronda.equipoSegundo.jugador.puntosGanadosEnvidoRonda > 0
                        ? this.ronda.equipoSegundo
                        : null;

            // Si el oponente ganó el envido, obtener sus puntos de envido
            if (equipoGanadorEnvido === oponente) {
                // Asegúrate que el jugador tenga un método para calcular sus puntos con sus cartas originales
                puntosOponenteEnvido = oponente.jugador.getPuntosDeEnvido(oponente.jugador.cartas);
            }
        }

        // Construir y devolver el objeto de contexto para la IA
        return {
            equipoIA: equipoIA,
            oponente: oponente,
            limitePuntaje: this.ronda.limitePuntaje,
            nroMano: this.ronda.numeroDeMano, // Mano actual (0, 1 o 2)
            // Último canto de Truco real (no respuestas como Quiero/NoQuiero)
            ultimoCantoTruco: getLast(this.cantosTruco.filter(c => !this.ronda.esRespuesta(c.canto)))?.canto ?? null,
            miCartaEnMesa: cartaJugadorActual, // Carta que la IA jugó en la mano actual (si jugó)
            cartaOponenteEnMesa: cartaOponenteActual, // Carta que el oponente jugó en la mano actual (si jugó)
            resultadoMano0: resMano0, // Resultado de la mano 0 para la IA (-1: perdió, 0: empató, 1: ganó)
            resultadoMano1: resMano1, // Resultado de la mano 1 para la IA (-1: perdió, 0: empató, 1: ganó)
            misCartasEnMano: ia.cartasEnMano, // Cartas que la IA aún tiene en la mano
            cartasJugadasOponente: oponente.jugador.cartasJugadasRonda, // Cartas que el oponente ya jugó en la ronda
            puntosEnvidoGanadosIA: ia.puntosGanadosEnvidoRonda, // Puntos de envido que la IA ganó en esta ronda
            puntosEnvidoCantadosOponente: puntosOponenteEnvido, // Puntos de envido del oponente si los ganó y se cantaron
            cartaJugadaIAMano0: cartaIA_M0, // Carta jugada por la IA en la mano 0 (o null)
            cartaJugadaOpMano0: cartaOp_M0,   // Carta jugada por el oponente en la mano 0 (o null)
            probabilidad: { // Funciones de probabilidad (si las usas)
                deducirCarta: ia.prob.deducirCarta.bind(ia.prob), // Ejemplo
            },
            // Puedes añadir más información relevante aquí si la IA la necesita
        };
    }


    public procesarRespuestaTruco(): boolean {
        if (!this.equipoDebeResponderTruco) {
            this.logDebug('procesarRespuestaTruco llamado incorrectamente.');
            this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
            return false;
        }
        const jugadorResponde = this.equipoDebeResponderTruco.jugador;

        if (jugadorResponde.esHumano) {
            return true;
        } else {
            const ia = jugadorResponde as IA;
            const contextoTruco = this.crearContextoTruco(ia);
            let respuestaIA = ia.truco(true, contextoTruco);

            const accionesPosiblesIA = this.getPosiblesRespuestas();
            if (!accionesPosiblesIA.includes(respuestaIA)) {
                this.logDebug(
                    `IA ${ia.nombre} intentó respuesta inválida de Truco (${respuestaIA}). Forzando NoQuiero.`
                );
                respuestaIA = Canto.NoQuiero;
            }
            if (respuestaIA === Canto.Paso) {
                respuestaIA = Canto.NoQuiero;
            }

            this.registrarRespuesta(respuestaIA, this.equipoDebeResponderTruco);
            return false;
        }
    }

    private logDebug(mensaje: string): void {
        this.ronda.callbacks.displayLog(`TrucoHandler: ${mensaje}`, 'debug');
    }

    private setTurnoPostTruco(equipoQueRespondioQuiero: Equipo): void {
        if (this.equipoInterrumpido) {
            // Si un turno de juego fue interrumpido, el turno VUELVE a ese jugador.
            this.ronda.equipoEnTurno = this.equipoInterrumpido;
            // Nota: this.equipoInterrumpido se limpiará después en registrarRespuesta
        } else {
            // Si NADIE fue interrumpido (ej: Truco se cantó justo después de una jugada),
            // el turno para la siguiente jugada pasa al oponente de quien dijo "Quiero".
            // (Porque quien dijo "Quiero" acaba de responder, no de jugar carta).
            this.ronda.equipoEnTurno = this.ronda.getOponente(equipoQueRespondioQuiero);
        }
         if(this.ronda.estadoRonda !== EstadoRonda.RondaTerminada) {
             this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
         }
    }
}