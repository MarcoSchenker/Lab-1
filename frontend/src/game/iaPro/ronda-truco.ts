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
    }
    

    private puedeCantar(equipo: Equipo): boolean {
        if (this.ronda.envidoHandler.equipoDebeResponderEnvido) return false;
        if (this.trucoResuelto) return false;
        if (this.equipoDebeResponderTruco === equipo) return false;
        
        const ultimoCantoObj = getLast(this.cantosTruco);
            if (!ultimoCantoObj) return true;
        

        if (this.ronda.esRespuesta(ultimoCantoObj.canto)) {
            if ( ultimoCantoObj.canto === Canto.NoQuiero || ultimoCantoObj.canto === Canto.IrAlMazo) {
        return false;
        }
        return ultimoCantoObj.equipo === equipo;
        } else {
        return ultimoCantoObj.equipo !== equipo;
        }
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
        this.ronda.callbacks.showPlayerCall(equipoQueCanta.jugador, this.ronda.cantoToString(canto));
        this.cantosTruco.push({ canto, equipo: equipoQueCanta });
        this.equipoDebeResponderTruco = this.ronda.getOponente(equipoQueCanta);
        this.ronda.envidoHandler.equipoDebeResponderEnvido = null;
        
        this.ronda.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
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
            // Determinar quién ganó el envido basándose en los puntos registrados en los jugadores
            // (Esta lógica asume que guardas los puntos ganados en el jugador/equipo)
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

    private setTurnoPostTruco(equipoQueRespondio: Equipo): void {
        // Determinar quién debería tener el turno según las reglas del juego
        // Si es la primera mano y el truco se resolvió, respeta el orden original
        if (this.ronda.numeroDeMano === 0) {
            this.ronda.equipoEnTurno = this.ronda.turnoHandler.getEquipoQueSigueMano(0); // Este método tampoco existe
        } else {
            // Si ya hubo manos previas, el ganador de la última mano debería tener el turno
            const ultimoGanador = this.ronda.turnoHandler.getGanadorUltimaMano(); // Este método tampoco existe
            this.ronda.equipoEnTurno = ultimoGanador || this.ronda.equipoMano;
        }
    }
}