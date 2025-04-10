// ia.ts
import { Jugador } from './jugador';
import { Probabilidad } from './probabilidad';
import { Naipe } from './naipe';
import { Canto, Palo, Equipo } from './types';
import { Ronda } from './ronda';
import { getRandomInt, getLast } from './utils';
import { EnvidoContext, TrucoContext } from './ia-context'; // Asegúrate que este archivo existe y está correcto

export class IA extends Jugador {
    public prob: Probabilidad;
    public estrategiaDeJuego: (ronda: Ronda) => number; // Devuelve el índice de la carta a jugar

    // Propiedades para estadísticas (equivalentes a las de JS)
    public envidoS: number[] = [];
    public revire: number[] = [];
    public realEnvido: number[] = [];
    public faltaEnvido: number[] = [];


    constructor(nombre: string) {
        super(nombre, false); // esHumano = false
        this.prob = new Probabilidad();
        this.estrategiaDeJuego = this.estrategiaClasica; // Estrategia por defecto
    }

    // --- Métodos Helper (Traducidos de JS) ---

    /** Clasifica una carta en baja(0), media(1), alta(2) */
    private clasificar(carta: Naipe): number {
        if (carta.valor <= 6) return 0;      // 4, 5, 6
        else if (carta.valor <= 10) return 1; // 7s falsos, 10, 11, 12
        else return 2;                       // 1, 2, 3, 7s verdaderos, Anchos
    }

    /**
     * Elige la carta mas baja(0) o la mas alta(1) segun los datos.
     * @param orden 0: busca la más baja; 1: busca la más alta (o la más baja que mate a cartaComparar).
     * @param cartaComparar Carta del oponente a la que se intenta matar (si orden es 1).
     * @param claseC Filtra por clase de carta (0: baja, 1: media, 2: alta).
     * @returns El índice de la carta elegida en cartasEnMano, o -1 si no se encuentra.
     */
    private elegir(orden: 0 | 1, cartaComparar: Naipe | null = null, claseC?: 0 | 1 | 2): number {
        let indice = -1;
        let valor = (orden === 0) ? 99 : (cartaComparar === null ? -1 : 99); // Valor inicial para comparación

        for (let i = 0; i < this.cartasEnMano.length; i++) {
            const cartaActual = this.cartasEnMano[i];
            const v_act = cartaActual.valor;
            const ctipo = this.clasificar(cartaActual);

            if (claseC !== undefined && claseC !== ctipo) continue; // Saltar si no es de la clase buscada

            switch (orden) {
                case 0: // Busca la carta más chica
                    if (v_act < valor) {
                        valor = v_act;
                        indice = i;
                    }
                    break;
                case 1: // Busca la más grande / la más chica que mate
                    if (cartaComparar === null) { // Busca la más grande
                        if (v_act > valor) {
                            valor = v_act;
                            indice = i;
                        }
                    } else { // Busca la más chica que mate a cartaComparar
                        if (v_act < valor && v_act > cartaComparar.valor) {
                            valor = v_act;
                            indice = i;
                        }
                    }
                    break;
            }
        }
        // Si buscando la más alta no se encontró ninguna (indice -1), devolver la más alta absoluta.
         if (orden === 1 && cartaComparar === null && indice === -1 && this.cartasEnMano.length > 0) {
             let maxValor = -1;
             for (let i = 0; i < this.cartasEnMano.length; i++) {
                 if (this.cartasEnMano[i].valor > maxValor) {
                     maxValor = this.cartasEnMano[i].valor;
                     indice = i;
                 }
             }
         }
         // Si buscando la más chica que mate no se encontró, devolver -1 (ya lo hace).

        return indice;
    }

    /**
     * Determina si la IA ganó(>0), perdió(<0) o empató(0) una mano específica.
     * Adaptado para usar el contexto TrucoContext en lugar de _rondaActual global.
     */
    private gane(nroMano: number, contexto: TrucoContext): number {
        // Necesitamos las cartas jugadas en esa mano específica. El contexto TrucoContext
        // no tiene directamente el historial completo de cartas jugadas por mano de forma simple.
        // Se podría añadir al contexto, o calcularlo aquí si la Ronda lo permite.
        // *** SOLUCIÓN TEMPORAL: Asumir que la Ronda tiene acceso a las cartas jugadas por mano ***
        // Esto requiere modificar TrucoContext o pasar la Ronda. Por ahora, simulamos:
        // const cartaIA = contexto.cartasJugadasIA[nroMano]; // Necesitaría esta propiedad
        // const cartaOp = contexto.cartasJugadasOponente[nroMano]; // Necesitaría esta propiedad

        // *** SOLUCIÓN ALTERNATIVA: Usar resultadosMano0 y resultadoMano1 del contexto ***
        if (nroMano === 0) return contexto.resultadoMano0;
        if (nroMano === 1) return contexto.resultadoMano1;

        // Para mano 2, si se llega a necesitar aquí, habría que calcularla o añadirla al contexto.
        console.warn("Función gane() llamada para mano > 1, no implementado completamente con TrucoContext actual.");
        return 0; // Valor por defecto o lanzar error
    }

    /** Cuenta cartas altas, medias y bajas en un array de cartas. */
    private clasificarCartas(cartas: Naipe[]): { alta: number; media: number; baja: number } {
        let media = 0, alta = 0, baja = 0;
        for (const carta of cartas) {
            const clasificacion = this.clasificar(carta);
            if (clasificacion === 0) baja++;
            else if (clasificacion === 1) media++;
            else alta++;
        }
        return { alta, media, baja };
    }

    /**
     * Devuelve el indice de la carta en mano con menor valor capaz de matar la carta pasada por argumento.
     * Si no la puede matar, devuelve -1.
    */
    private laMato(cartaOp: Naipe): number {
        let indice = -1;
        let valor = 99; // Valor inicial alto para buscar la menor que mate

        for (let i = 0; i < this.cartasEnMano.length; i++) {
            if (cartaOp.valor < this.cartasEnMano[i].valor) { // Si mi carta mata
                if (this.cartasEnMano[i].valor < valor) { // Y es la menor que mata hasta ahora
                    valor = this.cartasEnMano[i].valor;
                    indice = i;
                }
            }
        }
        return indice;
    }

    /** Determina si tengo al menos una carta más baja que la carta del oponente. */
    private masBaja(cartaOp: Naipe): boolean {
        for (const cartaMano of this.cartasEnMano) {
            if (cartaOp.valor > cartaMano.valor) {
                return true;
            }
        }
        return false;
    }

    /** Calcula los puntos en juego actualmente en el Truco y cuál sería el siguiente canto. */
    private ptoEnJuego(ultimo: Canto | null): { now: number; next: Canto | ''; pnext: number } {
        switch (ultimo) {
            case Canto.Truco:
                return { now: 2, next: Canto.ReTruco, pnext: 3 };
            case Canto.ReTruco:
                return { now: 3, next: Canto.ValeCuatro, pnext: 4 };
            case Canto.ValeCuatro:
                return { now: 4, next: '', pnext: 4 }; // No hay siguiente canto
            default: // No se cantó nada o es un estado inválido aquí
                return { now: 1, next: Canto.Truco, pnext: 2 }; // La ronda vale 1, el siguiente es Truco
        }
    }

   /**
 * Lleva estadistica de los cantos de envido del oponente cuando el envido fue querido.
 * @param historialCantos El historial completo de cantos de envido de la ronda.
 * @param puntosEnvidoOponenteSiQuerido Los puntos que cantó el oponente, SOLO si el envido se resolvió con 'Quiero'. Null en otros casos.
 */
public statsEnvido(historialCantos: { canto: Canto; equipo: Equipo }[], puntosEnvidoOponenteSiQuerido: number | null): void {
    if (puntosEnvidoOponenteSiQuerido === null || historialCantos.length === 0) {
        return; // No hacer nada si el envido no se quiso o no hubo cantos.
    }

    // Encontrar el último canto realizado por el oponente (no una respuesta)
    let ultimoCantoOponente: Canto | null = null;
    for (let i = historialCantos.length - 1; i >= 0; i--) {
        const item = historialCantos[i];
        // Verificar si el canto fue del oponente (no de esta IA)
        // Necesitamos una forma de comparar equipos/jugadores. Asumiendo que tenemos acceso a `this.equipo` o similar.
        // O mejor, que Ronda pase el equipo Oponente.
        // Forma simple (asumiendo 1v1): si no es la IA, es el oponente.
        const equipoOponente = historialCantos.find(h => h.equipo.jugador !== this)?.equipo; // Encuentra el equipo oponente
        if (equipoOponente && item.equipo === equipoOponente && !this.esRespuesta(item.canto)) {
             ultimoCantoOponente = item.canto;
             break;
        }
    }


    if (ultimoCantoOponente) {
         switch (ultimoCantoOponente) {
             case Canto.Envido:
                 this.envidoS.push(puntosEnvidoOponenteSiQuerido);
                 break;
             case Canto.EnvidoEnvido: // Asume que vino de Envido -> EnvidoEnvido
                 this.revire.push(puntosEnvidoOponenteSiQuerido);
                 break;
             case Canto.RealEnvido:
                 this.realEnvido.push(puntosEnvidoOponenteSiQuerido);
                 break;
             case Canto.FaltaEnvido:
                 this.faltaEnvido.push(puntosEnvidoOponenteSiQuerido);
                 break;
         }
    } else {
        // Si el oponente solo dijo "Quiero" (IA cantó primero), ¿qué estadística guardamos?
        // JS no parecía cubrir este caso explícitamente. Podríamos guardar en envidoS por defecto.
        // O podríamos decidir no guardar nada si el oponente no hizo un canto propio.
        // Por ahora, no guardamos si el oponente solo aceptó.
        console.warn(`[statsEnvido] No se encontró un canto explícito del oponente en el historial.`);
    }
}

// Helper interno para esRespuesta (ya debería existir o crearlo)
private esRespuesta(canto: Canto): boolean {
    return canto === Canto.Quiero || canto === Canto.NoQuiero;
}


    // --- Decisión ENVIDO (Lógica JS Adaptada a TS y Contexto) ---
    public envido(contexto: EnvidoContext): Canto { // Ahora recibe el contexto completo
    
        // Determinar si IA está respondiendo o iniciando el canto
        // Original en envido() dentro de ia.ts
        // const ultimoCanto = contexto.historialEnvido?.findLast(c => !this.esRespuesta(c.canto));

        // Alternativa
        const cantosNoRespuesta = contexto.historialEnvido?.filter(c => !this.esRespuesta(c.canto));
        const ultimoCanto = cantosNoRespuesta && cantosNoRespuesta.length > 0 ? cantosNoRespuesta[cantosNoRespuesta.length - 1] : undefined;
        const iaDebeResponder = ultimoCanto?.equipo !== contexto.equipoIA && ultimoCanto !== undefined;
    
    
        if (iaDebeResponder) { // Respondiendo
            return this.decidirRespuestaEnvido(contexto);
        } else { // Iniciando o continuando un canto propio (si aplica)
            return this.decidirCantoEnvidoInicial(contexto);
        }
    }
    
    private decidirCantoEnvidoInicial(contexto: EnvidoContext): Canto {
        const { misPuntosEnvido, cartaVistaOponente, probabilidad, statsEnvidoOponente, equipoIA, oponente, limitePuntaje, esIAManoDeRonda } = contexto;
        const p1 = oponente.puntos; const p2 = equipoIA.puntos; const diff = p1 - p2;
        const posibleModificador = probabilidad.evaluarCartaVista(cartaVistaOponente); // Usar evaluarCartaVista
        const valor = probabilidad.ponderarPuntos(misPuntosEnvido);
        const ran = getRandomInt(0, 100);
    
        // Lógica especial cerca del final
        if (p2 >= limitePuntaje - 2) {
            // JS usaba this.envidoS (propio). ¿Debería usar el historial del oponente aquí?
            // La lógica original parece defensiva: si el oponente suele tener poco, canto falta.
            const pHistorialOponente = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.envidoS);
            const pHistorialFactor = pHistorialOponente === null ? 0 : -(15 - pHistorialOponente);
             // Ajustar la condición original JS (ran + diff < valor * 100) con el factor historial?
             // Por ahora, mantenemos la versión simple de TS:
            if (ran + diff < valor * 100) return Canto.FaltaEnvido;
            else return Canto.Paso;
        }
    
        // Lógica normal para iniciar
        if (!esIAManoDeRonda) { // Soy pie (oponente jugó carta O podría haberla jugado)
             if (misPuntosEnvido > 28) {
                  // Usar statsEnvidoOponente
                 const pHistorialOponente = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.envidoS.concat(statsEnvidoOponente.revire, statsEnvidoOponente.realEnvido));
                 if (pHistorialOponente === null || pHistorialOponente < misPuntosEnvido) {
                     return (misPuntosEnvido > 30) ? Canto.RealEnvido : Canto.Envido; // JS era más agresivo con R
                 } else {
                     return (misPuntosEnvido > 30) ? Canto.RealEnvido : Canto.Envido; // JS era R siempre si pHistorial >= puntos
                     // Mantener adaptación TS por ahora: R con 31+, E con 29-30
                 }
             } else {
                 if (cartaVistaOponente && cartaVistaOponente.puntosEnvido >= misPuntosEnvido && misPuntosEnvido < 7) return Canto.Paso;
                 // JS: if (ran + posible + diff < valor * 100 ) return 'E';
                 // Adaptación TS: usar posibleModificador
                 if (ran + posibleModificador - diff < valor * 100) return Canto.Envido; // Usar +/- según si modificador es positivo/negativo? JS sumaba siempre.
                 else return Canto.Paso;
             }
        } else { // Soy mano
             // JS: if (ran + posible < valor * 100 ) return 'E'; -> No usaba diff si era mano? Revisar JS.
             // gitia.js, linea 496: if (ran + posible < valor * 100 ) return 'E'; -> Correcto, no usa diff si es mano.
             if (ran + posibleModificador < valor * 100) return Canto.Envido; // Usar posibleModificador
             else return Canto.Paso;
        }
    }
    
    private decidirRespuestaEnvido(contexto: EnvidoContext): Canto {
        const { misPuntosEnvido, ultimoCantoEnvido, puntosEnvidoAcumulados, puntosSiNoQuiero, cartaVistaOponente, probabilidad, statsEnvidoOponente, equipoIA, oponente, limitePuntaje } = contexto;
    
        if (!ultimoCantoEnvido) return Canto.Paso; // No debería pasar
    
        const p1 = oponente.puntos; const p2 = equipoIA.puntos; const diff = p1 - p2;
        const loQueFalta = limitePuntaje - Math.max(p1, p2);
        const posibleModificador = probabilidad.evaluarCartaVista(cartaVistaOponente); // Usar evaluarCartaVista
        const valor = probabilidad.ponderarPuntos(misPuntosEnvido);
        let ran = getRandomInt(0, 100);
    
        // Lógica especial cerca del final (como en JS)
        if (p2 >= limitePuntaje - 2) {
             return Canto.FaltaEnvido;
        }
    
        // Usar puntosSiNoQuiero del contexto
        // JS: if (puntos <= 7) return 'N' ; --> Mantener, pero chequear Falta Envido
        if (misPuntosEnvido <= 7 && ultimoCantoEnvido !== Canto.FaltaEnvido) return Canto.NoQuiero;
    
        // JS: if (p2 > p1 && acumulado > loQueFalta && puntosNoQuerido > loQueFalta && ultimo !== 'F') return 'F';
        // Usar puntosEnvidoAcumulados (puntos si quiero) y puntosSiNoQuiero
        if (p2 > p1 && puntosEnvidoAcumulados > loQueFalta && puntosSiNoQuiero > loQueFalta && ultimoCantoEnvido !== Canto.FaltaEnvido) {
             return Canto.FaltaEnvido;
        }
    
        // JS: if (acumulado > loQueFalta && p2 > p1 && ultimo !== 'F') { ... } -> Considerar Falta
        if (puntosEnvidoAcumulados > loQueFalta && p2 > p1 && ultimoCantoEnvido !== Canto.FaltaEnvido) {
             // Usar statsEnvidoOponente
             const pHistorialOponenteRE = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.realEnvido.concat(statsEnvidoOponente.envidoS, statsEnvidoOponente.revire));
             const pREFactor = pHistorialOponenteRE === null ? 0 : -(15 - pHistorialOponenteRE);
             // JS: if(ran + posible + diff + acumulado + pRE < valor * 100) return 'F'; -> 'acumulado' era nro cantos?
             // Adaptación TS: Usamos puntosEnvidoAcumulados. ¿Ponderar el factor?
             if (ran + posibleModificador - diff + puntosEnvidoAcumulados + pREFactor < valor * 100) return Canto.FaltaEnvido;
        }
    
        // JS: if (puntosNoQuerido + p1 > 30) return 'S'; -> Acepto si no querer me hace perder
        if (puntosSiNoQuiero + p1 >= limitePuntaje) return Canto.Quiero;
    
    
        let pHistorialOponente: number | null = null;
        let pHistorialFactor = 0;
    
        switch (ultimoCantoEnvido) {
            case Canto.Envido:
                // Usar statsEnvidoOponente
                pHistorialOponente = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.envidoS);
                pHistorialFactor = pHistorialOponente === null ? 0 : -(15 - pHistorialOponente);
                // JS: if (ran + posible + diff + acumulado + pRE < valor * 100) -> acumulado = 1?
                // Adaptación TS: usar puntos acumulados (serían 2 si quiero).
                 if (ran + posibleModificador - diff + puntosEnvidoAcumulados + pHistorialFactor < valor * 100) {
                     return (misPuntosEnvido >= 30) ? Canto.EnvidoEnvido : Canto.Quiero;
                } else {
                     return (misPuntosEnvido >= 30) ? Canto.Quiero : Canto.NoQuiero;
                }
            case Canto.EnvidoEnvido: // Asume vino de E -> EE
                 if (misPuntosEnvido >= 30) ran = 0; // Mantener lógica JS?
                 // Usar statsEnvidoOponente
                 pHistorialOponente = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.revire.concat(statsEnvidoOponente.envidoS));
                 pHistorialFactor = pHistorialOponente === null ? 0 : -(15 - pHistorialOponente);
                 // JS: if (ran + posible + diff + acumulado + pRE < valor * 100) -> acumulado = 2?
                 // Adaptación TS: Puntos si quiero serían 4.
                 if (ran + posibleModificador - diff + puntosEnvidoAcumulados + pHistorialFactor < valor * 100) {
                     return Canto.Quiero;
                 } else {
                     return Canto.NoQuiero;
                 }
            case Canto.RealEnvido:
                 if (misPuntosEnvido >= 31) ran = 0; // Mantener lógica JS?
                  // Usar statsEnvidoOponente
                 pHistorialOponente = probabilidad.medianaEnvidoOponente(statsEnvidoOponente.realEnvido.concat(statsEnvidoOponente.envidoS, statsEnvidoOponente.revire));
                 pHistorialFactor = pHistorialOponente === null ? 0 : -(15 - pHistorialOponente);
                 // JS: if (ran + posible + diff + acumulado * 2 + pRE * 2 < valor * 100) -> acumulado = 1 o 2? pRE * 2?
                 // Adaptación TS: Puntos si quiero serían 3 (si vino de E->R) o 5 (E->EE->R?). Ponderar más.
                 if (ran + posibleModificador - diff + (puntosEnvidoAcumulados * 1.5) + (pHistorialFactor * 1.5) < valor * 100) {
                      return Canto.Quiero;
                 } else {
                      return Canto.NoQuiero;
                 }
            case Canto.FaltaEnvido:
                 // JS: if (ran + posible + diff + acumulado * 2 < valor * 100) -> acumulado nro cantos?
                 // Adaptación TS: Puntos si quiero son la falta. Ponderar mucho.
                 if (ran + posibleModificador - diff + (puntosEnvidoAcumulados * 2) < valor * 100) {
                     return Canto.Quiero;
                 } else {
                     return Canto.NoQuiero;
                 }
            default: return Canto.NoQuiero;
        }
    }


    // --- Decisión TRUCO (Traducción Fiel JS Mantenida con Ajustes Contexto) ---
    public truco(resp: boolean, contexto: TrucoContext): Canto {
        // console.log(`[IA ${this.nombre}] Decidiendo Truco (Lógica Original JS Fiel)`);
        const { probabilidad, puntosEnvidoCantadosOponente, oponente } = contexto;

        // Obtener posibles cartas basado en puntos de envido cantados por Oponente
        const posiblesCartasOp = (puntosEnvidoCantadosOponente !== null)
            ? probabilidad.deducirCarta(puntosEnvidoCantadosOponente, oponente.jugador.cartasJugadasRonda) // Usar cartasJugadasRonda
            : null;
        // Ordenar posibles por valor descendente (la más alta primero)
        const posiblesCartasOpOrdenadas = posiblesCartasOp?.sort((a, b) => b.valor - a.valor) ?? null;

        if (resp) { // Me cantaron, tengo que responder
            return this.respuestaTruco(contexto, posiblesCartasOpOrdenadas);
        } else { // Tengo el turno, puedo cantar o escalar
            if (contexto.ultimoCantoTruco === null) { // No se cantó nada aún
                 return this.cantarTruco(contexto, posiblesCartasOpOrdenadas);
            } else { // Ya hay un canto en la mesa (T, RT), puedo escalar
                 return this.escalarTruco(contexto, posiblesCartasOpOrdenadas);
            }
        }
    }

    // --- Helpers Detallados para TRUCO (Traducción Fiel JS con Ajustes TS) ---

    private respuestaTruco(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { nroMano } = contexto;
        switch(nroMano) {
            case 0: return this.respuestaTrucoMano0(contexto, posiblesCartasOp);
            case 1: return this.respuestaTrucoMano1(contexto, posiblesCartasOp);
            case 2: return this.respuestaTrucoMano2(contexto, posiblesCartasOp);
            default: return Canto.NoQuiero; // Seguridad
        }
    }

    private cantarTruco(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
         const { nroMano } = contexto;
         switch(nroMano) {
            case 0: return this.cantoTrucoMano0(contexto, posiblesCartasOp);
            case 1: return this.cantoTrucoMano1(contexto, posiblesCartasOp);
            case 2: return this.cantoTrucoMano2(contexto, posiblesCartasOp);
            default: return Canto.Paso; // Seguridad
        }
    }

     private escalarTruco(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
         const { nroMano } = contexto;
         switch(nroMano) {
            case 0: return this.escalarTrucoMano0(contexto, posiblesCartasOp);
            case 1: return this.escalarTrucoMano1(contexto, posiblesCartasOp);
            case 2: return this.escalarTrucoMano2(contexto, posiblesCartasOp);
            default: return Canto.Paso; // Seguridad
        }
    }

    // --- Implementación Detallada Helpers Truco (Traducción JS con ajustes TS) ---

    private respuestaTrucoMano0(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { ultimoCantoTruco, equipoIA, oponente, misCartasEnMano, puntosEnvidoGanadosIA } = contexto;
        const clasif = this.clasificarCartas(misCartasEnMano);
        const mediaalta = clasif.alta + clasif.media;
        const diff = equipoIA.puntos - oponente.puntos; // Negativo si IA va perdiendo
        const ran = getRandomInt(0, 100);

        switch(ultimoCantoTruco){
            case Canto.Truco: // Respondiendo a Truco
                // JS: if(e2.jugador.puntosGanadosEnvido<2&&(mediaalta)>=2&&clasif.alta>=1) return'S';
                if (puntosEnvidoGanadosIA < 2 && mediaalta >= 2 && clasif.alta >= 1) return Canto.Quiero;
                // JS: if(clasif.baja===3&&ran<=50)return'RT';
                if (clasif.baja === 3 && ran <= 50) return Canto.ReTruco; // Mentir con 3 malas
                // JS: if(mediaalta>=2&&diff<0)return'RT';
                if (mediaalta >= 2 && diff < 0) return Canto.ReTruco; // Ir perdiendo y tener 2 buenas -> RT
                // JS: if(mediaalta>=1&&diff>0)return'S';
                if (mediaalta >= 1 && diff > 0) return Canto.Quiero; // Ir ganando y tener 1 buena -> S
                // JS: return(ran<66?'N':'S');
                return (ran < 66) ? Canto.NoQuiero : Canto.Quiero; // Default random

            case Canto.ReTruco: // Respondiendo a ReTruco
            case Canto.ValeCuatro: // Respondiendo a ValeCuatro (JS combinaba lógica)
                // JS: if(clasif.alta>=2)return'S';
                if (clasif.alta >= 2) return Canto.Quiero;
                // JS: if((mediaalta)>=2&&diff>3)return'S';
                if (mediaalta >= 2 && diff > 3) return Canto.Quiero; // Ganando por 4+ pts y tener 2 buenas -> S
                // JS: if(e2.jugador.puntosGanadosEnvido>=2)return'N';
                if (puntosEnvidoGanadosIA >= 2) return Canto.NoQuiero; // Si ya gané envido, no arriesgo en RT/V4
                // JS: return'N';
                return Canto.NoQuiero; // Default No Quiero
            default:
                 console.error("RespuestaTrucoMano0: Canto inesperado:", ultimoCantoTruco);
                 return Canto.NoQuiero;
        }
    }

    private respuestaTrucoMano1(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { ultimoCantoTruco, miCartaEnMesa, cartaOponenteEnMesa, misCartasEnMano, resultadoMano0, puntosEnvidoGanadosIA } = contexto;
        const clasif = this.clasificarCartas(misCartasEnMano); // Cartas restantes
        const mediaalta = clasif.alta + clasif.media;

        if (resultadoMano0 > 0) { // IA Ganó mano 0
             // JS: if(miMesa === null){ ... } else { ... } --> Lógica JS separaba si IA ya jugó o no.
             if (miCartaEnMesa === null) { // IA (mano) aún no jugó en esta mano 1
                 // Oponente (pie) cantó Truco/RT/V4 antes de jugar
                  switch(ultimoCantoTruco) {
                      case Canto.Truco: // Nunca debería pasar, si IA es mano, juega o canta primero
                          console.error("Caso inesperado: IA mano responde Truco sin haber jugado en mano 1");
                          return Canto.Quiero;
                      case Canto.ReTruco: // Oponente cantó RT directamente
                          if(mediaalta >= 1) return (clasif.alta >= 1 ? Canto.ValeCuatro : Canto.Quiero); // Si tengo >=media, respondo V4 con alta, S con media
                          // JS: else if (clasif.baja === 1 && clasif.media === 1) return 'S'; // caso específico JS
                          if (clasif.baja === 1 && clasif.media === 1) return Canto.Quiero;
                          else return Canto.NoQuiero;
                      case Canto.ValeCuatro: // Oponente cantó V4 directamente
                          if(mediaalta >= 1) return Canto.Quiero; // Con >=media acepto V4
                          return Canto.NoQuiero;
                      default: return Canto.NoQuiero;
                  }
             } else { // IA (mano) ya jugó en mano 1, Oponente (pie) respondió jugando y cantando
                  const cartaOponente = cartaOponenteEnMesa; // Carta del oponente en mano 1
                  if (!cartaOponente) { // Oponente cantó sin jugar? Raro.
                      console.warn("RespuestaTrucoMano1 (Gané M0): Oponente cantó sin jugar carta en mano 1");
                      // Asumir que Quiero por defecto si no hay info
                      return Canto.Quiero;
                  }
                 // Solo me queda 1 carta
                 if (misCartasEnMano.length !== 1) console.error("Error lógico: Debería quedar 1 carta");
                 const miCartaRestante = misCartasEnMano[0];

                 switch(ultimoCantoTruco) {
                     case Canto.Truco: // Oponente jugó y cantó Truco
                         // JS: if(this.cartasEnMano[0].valor >= 11) return 'RT';
                         if(miCartaRestante.valor >= 11) return Canto.ReTruco; // Si mi 3ra es >= 3, Retruco
                         // JS: if(miMesa.valor >= 11) return 'RT';
                         if (miCartaEnMesa.valor >= 11) return Canto.ReTruco; // Si jugué >= 3 en mano 1, Retruco
                         // JS: if(miMesa.valor >= 7){ if(this.cartasEnMano[0].valor >= 10) return 'RT'; else return 'S'; }
                         if (miCartaEnMesa.valor >= 7) { // Si jugué >= 12 en mano 1
                              return (miCartaRestante.valor >= 10) ? Canto.ReTruco : Canto.Quiero; // RT si 3ra es >= 2, sino S
                         } else { // Jugué < 12 en mano 1
                              // JS: var ran = getRandomInt(0,100); if(this.cartasEnMano[0].valor >= 6){ if(this.puntosGanadosEnvido >= 3 && ran <= 66) return 'N'; else return 'S'; }
                              const ran = getRandomInt(0, 100);
                              if(miCartaRestante.valor >= 6) { // Si mi 3ra es >= Ancho falso
                                   return (puntosEnvidoGanadosIA >= 3 && ran <= 66) ? Canto.NoQuiero : Canto.Quiero; // Dudo si gané envido
                              }
                         }
                         // JS: return 'N'; (Caso no cubierto arriba)
                         return Canto.NoQuiero; // Default si jugué baja y mi 3ra es baja
                     case Canto.ReTruco: // Oponente jugó y cantó ReTruco
                         if(miCartaRestante.valor >= 11) return Canto.ValeCuatro; // V4 si 3ra es >= 3
                         if(miCartaEnMesa.valor >= 11) return Canto.ValeCuatro; // V4 si jugué >= 3
                         if(miCartaEnMesa.valor >= 9) return Canto.Quiero; // S si jugué 2 o 3
                         if(miCartaEnMesa.valor >= 6) return (miCartaRestante.valor >= 9) ? Canto.Quiero : Canto.NoQuiero; // S si jugué >= Ancho falso Y 3ra es >= 2
                         // JS no cubría explícitamente jugar < Ancho Falso
                         return (miCartaRestante.valor >= 9) ? Canto.Quiero : Canto.NoQuiero; // S si 3ra es >= 2 aunque haya jugado basura

                     case Canto.ValeCuatro: // Oponente jugó y cantó ValeCuatro
                         if(miCartaRestante.valor >= 11) return Canto.Quiero; // S si 3ra >= 3
                         if(miCartaEnMesa.valor >= 11) return Canto.Quiero; // S si jugué >= 3
                         if(miCartaEnMesa.valor >= 9) return Canto.Quiero; // S si jugué 2 o 3
                         if(miCartaEnMesa.valor >= 6) return (miCartaRestante.valor >= 9) ? Canto.Quiero : Canto.NoQuiero; // S si jugué >= A.falso Y 3ra >= 2
                         return (miCartaRestante.valor >= 9) ? Canto.Quiero : Canto.NoQuiero; // S si 3ra >= 2

                     default: return Canto.NoQuiero;
                 }
             }

        } else if (resultadoMano0 === 0) { // Empardamos mano 0
            let cartaOp = cartaOponenteEnMesa;
            // JS: if(suMesa===null&&posiblesCartas!==null) suMesa=posiblesCartas[0]; // Estimar si no jugó
            if (!cartaOp && posiblesCartasOp && posiblesCartasOp.length > 0) {
                cartaOp = posiblesCartasOp[0];
            }
            // JS: if(miMesa !== null && miMesa.valor < 8) return 'N'; // Si IA ya jugó y fue < Rey, no quiere
            if (miCartaEnMesa && miCartaEnMesa.valor < 8) return Canto.NoQuiero;
            // JS: if(suMesa !== null && this.laMato(suMesa) === -1 ) return 'N'; // Si Oponente jugó y no lo mato, no quiero
            if (cartaOp && this.laMato(cartaOp) === -1) return Canto.NoQuiero;

            switch(ultimoCantoTruco) {
                case Canto.Truco:
                    // JS: if (suMesa !== null && this.laMato(suMesa) > -1 ) return 'RT'; // Si puedo matar, Retruco
                    if (cartaOp && this.laMato(cartaOp) > -1) return Canto.ReTruco;
                    // JS: if(mediaalta > 0) return 'S';
                    if (mediaalta > 0) return Canto.Quiero; // Si me queda >= Media, Quiero
                    return Canto.NoQuiero;
                case Canto.ReTruco:
                    // JS: if (suMesa !== null && this.laMato(suMesa) > -1 ) return 'V'; // Si puedo matar, Vale4
                    if (cartaOp && this.laMato(cartaOp) > -1) return Canto.ValeCuatro;
                    // JS: if (miMesa !== null && miMesa.valor >= 11) return 'S'; // Si jugué >= 3, Quiero
                    if (miCartaEnMesa && miCartaEnMesa.valor >= 11) return Canto.Quiero;
                    // JS: if (miMesa !== null && miMesa.valor >= 13) return 'V'; // Si jugué Ancho Basto/Espada, Vale4? Raro pero ok.
                    if (miCartaEnMesa && miCartaEnMesa.valor >= 13) return Canto.ValeCuatro;
                    // JS: if(clasif.alta > 0) return 'S'; // Si me queda Alta, Quiero
                    if (clasif.alta > 0) return Canto.Quiero;
                    return Canto.NoQuiero;
                case Canto.ValeCuatro:
                     // JS: if (miMesa !== null && miMesa.valor >= 11) return 'S';
                    if (miCartaEnMesa && miCartaEnMesa.valor >= 11) return Canto.Quiero;
                     // JS: if(clasif.alta > 0) return 'S';
                    if (clasif.alta > 0) return Canto.Quiero;
                    return Canto.NoQuiero;
                default: return Canto.NoQuiero;
            }
        } else { // IA Perdió mano 0
            const cartaOp = cartaOponenteEnMesa;
             // JS: if(suMesa === null){ ... } else { ... }
             if (!cartaOp) { // Oponente (mano) cantó sin jugar aún en mano 1
                switch(ultimoCantoTruco){
                    case Canto.Truco:
                        // JS: if(mediaalta === 2) return 'S'; else return 'N';
                        return (mediaalta === 2) ? Canto.Quiero : Canto.NoQuiero; // Necesito 2 buenas para querer
                    case Canto.ReTruco:
                         // JS: if(clasif.alta === 2) return 'S'; else return 'N';
                        return (clasif.alta === 2) ? Canto.Quiero : Canto.NoQuiero; // Necesito 2 ALTAS para querer RT
                    case Canto.ValeCuatro:
                         // JS: if(clasif.alta === 2) return 'S'; else return 'N';
                        return (clasif.alta === 2) ? Canto.Quiero : Canto.NoQuiero; // Necesito 2 ALTAS para querer V4
                    default: return Canto.NoQuiero;
                }
             } else { // Oponente (mano) ya jugó en mano 1 y cantó
                const matoIdx = this.laMato(cartaOp); // Índice de mi carta que mata la del oponente
                 switch(ultimoCantoTruco){
                     case Canto.Truco:
                         // Lógica JS original no tenía respuesta explícita aquí si oponente jugó.
                         // Asumiendo que si no puedo matar, no quiero. Si puedo, quizás quiero si la otra es buena?
                         if (matoIdx === -1) return Canto.NoQuiero;
                          // Si mato, y mi otra carta es >= media, quiero.
                          if (misCartasEnMano.length === 2) {
                             const otraCartaIdx = 1 - matoIdx;
                              if (this.clasificar(misCartasEnMano[otraCartaIdx]) >= 1) return Canto.Quiero;
                          }
                         return Canto.NoQuiero; // Default si mato pero la otra es baja
                     case Canto.ReTruco: // Respondiendo a ReTruco
                     case Canto.ValeCuatro: // Respondiendo a ValeCuatro (JS combinaba)
                         // JS: if(mato === -1) return 'N';
                         if (matoIdx === -1) return Canto.NoQuiero; // No puedo matar, no quiero
                         // JS: if(clasif.alta===2) return(ultimo === 'V') ? 'S' : 'V';
                         if (clasif.alta === 2) return (ultimoCantoTruco === Canto.ValeCuatro) ? Canto.Quiero : Canto.ValeCuatro; // Si tengo 2 altas, V4 si me cantaron RT, S si me cantaron V4
                         // JS: if(this.clasificar(this.cartasEnMano[1 - mato]) >= 1) return 'S';
                          if (misCartasEnMano.length === 2) {
                             const otraCartaIdx = 1 - matoIdx;
                             if (this.clasificar(misCartasEnMano[otraCartaIdx]) >= 1) return Canto.Quiero; // Si mato y la otra es >= Media, Quiero
                          }
                         // JS: return 'N';
                         return Canto.NoQuiero; // Default si mato pero la otra es baja
                    default: return Canto.NoQuiero;
                 }
             }
        }
       // return Canto.NoQuiero; // Fallback general
    }

     private respuestaTrucoMano2(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
         const { ultimoCantoTruco, miCartaEnMesa, cartaOponenteEnMesa, misCartasEnMano, resultadoMano1, puntosEnvidoGanadosIA } = contexto;
         // const clasif = this.clasificarCartas(misCartasEnMano); // Solo queda 1 carta, clasif no aplica igual
         if (misCartasEnMano.length !== 1) console.error("Error lógico: Debería quedar 1 carta en mano 2");
         const miCartaRestante = misCartasEnMano[0];

         if (resultadoMano1 > 0) { // IA ganó mano 1 (y por ende, la ronda)
             // JS: if(miMesa === null){ ... } else { ... }
             if (miCartaEnMesa === null) { // IA (mano) no jugó aún en mano 2, Oponente (pie) cantó
                 // Caso raro: Si gané la ronda, ¿por qué me cantaría el oponente? Quizás si hubo parda en mano 0.
                 switch(ultimoCantoTruco){
                     case Canto.Truco: // Oponente cantó Truco
                         return Canto.Quiero; // Ya gané, acepto
                     case Canto.ReTruco: // Oponente cantó RT
                         // JS: if(this.cartasEnMano[0].valor >= 13) return 'V'; if(this.cartasEnMano[0].valor >= 11) return 'S'; return 'N';
                         if (miCartaRestante.valor >= 13) return Canto.ValeCuatro;
                         return (miCartaRestante.valor >= 11) ? Canto.Quiero : Canto.NoQuiero; // S con >=3, N con <3
                     case Canto.ValeCuatro: // Oponente cantó V4
                          // JS: if(this.cartasEnMano[0].valor >= 13) return 'S'; return 'N';
                         return (miCartaRestante.valor >= 13) ? Canto.Quiero : Canto.NoQuiero; // S con Anchos, N con <Anchos
                     default: return Canto.Quiero; // Ya gané, acepto por defecto
                 }
             } else { // IA (mano) ya jugó en mano 2 (para ganar), Oponente (pie) cantó después
                 const miCartaJugada = miCartaEnMesa; // La carta que jugué para ganar la mano 1
                 const cartaOp = cartaOponenteEnMesa; // Carta del oponente en mano 2 (si jugó antes de cantar)

                 switch(ultimoCantoTruco){
                    case Canto.Truco: // Oponente cantó Truco
                        const ranT = getRandomInt(0, 100);
                        // JS: if(posiblesCartas !== undefined && ...){ if(posiblesCartas[0].valor < miMesa.valor) return 'S'; else return 'N'; } -> Si estimo que su mejor carta pierde, Quiero
                        if (posiblesCartasOp && posiblesCartasOp.length > 0 && posiblesCartasOp[0].valor < miCartaJugada.valor) return Canto.Quiero;
                        // JS: if(miMesa.valor >= 12) return 'RT';
                        if (miCartaJugada.valor >= 12) return Canto.ReTruco; // Si gané con >=7 Espada, RT
                        // JS: if(miMesa.valor >= 9) return 'S';
                        if (miCartaJugada.valor >= 9) return Canto.Quiero; // Si gané con >=2, S
                        // JS: if(miMesa.valor >= 6){ if(this.puntosGanadosEnvido >= 3) return 'N'; else if(ran <= 33) return 'S'; } --> Error JS? Debería ser N si ran > 33?
                        if (miCartaJugada.valor >= 6) { // Si gané con >=Ancho falso
                             return (puntosEnvidoGanadosIA >= 3 || ranT > 33) ? Canto.NoQuiero : Canto.Quiero; // Dudo si gané envido o carta media (corregido)
                        }
                        // JS: return 'N';
                        return Canto.NoQuiero; // Si gané con carta baja
                    case Canto.ReTruco: // Oponente cantó ReTruco
                         const ranRT = getRandomInt(0, 100);
                         // JS: if(miMesa.valor >= 13) return 'V';
                         if (miCartaJugada.valor >= 13) return Canto.ValeCuatro; // Si gané con Anchos, V4
                         // JS: if(miMesa.valor >= 9) return 'S';
                         if (miCartaJugada.valor >= 9) return Canto.Quiero; // Si gané con >=2, S
                         // JS: if(miMesa.valor >= 6){ if(this.puntosGanadosEnvido >= 3) return 'N'; else if(ran <= 33) return 'S'; } --> Igual que Truco
                         if (miCartaJugada.valor >= 6) {
                             return (puntosEnvidoGanadosIA >= 3 || ranRT > 33) ? Canto.NoQuiero : Canto.Quiero;
                         }
                         // JS: return 'N';
                         return Canto.NoQuiero;
                    case Canto.ValeCuatro: // Oponente cantó ValeCuatro
                         // JS: if(miMesa.valor >= 13) return 'S'; else return 'N';
                         return (miCartaJugada.valor >= 13) ? Canto.Quiero : Canto.NoQuiero; // S con Anchos, N con <Anchos
                    default: return Canto.Quiero; // Ya gané, acepto
                 }
             }
         } else if (resultadoMano1 === 0) { // Empardamos mano 1
            // JS: if ( this.gane(1) === 0 ) { ... } -> Usa la lógica de Parda en mano 1
            // La resolución depende de quien ganó la mano 0.
            // Reutilizar lógica de respuestaTrucoMano1 simulando Parda en mano 0
            const contextoSimuladoMano1 = { ...contexto, resultadoMano0: 0 }; // Simular parda anterior
            return this.respuestaTrucoMano1(contextoSimuladoMano1, posiblesCartasOp);

         } else { // IA Perdió mano 1 (y por ende, la ronda)
             const cartaOp = cartaOponenteEnMesa; // Carta con la que me ganaron mano 1
             if (!cartaOp) {
                 console.error("Error lógico: IA perdió mano 1 pero oponente no tiene carta en mesa?");
                 return Canto.NoQuiero;
             }
             // Verificar resultado de Mano 0 desde el contexto
            if (contexto.resultadoMano0 < 0) {
                // Caso: Perdí Mano 0 Y Perdí Mano 1
                // JS siempre respondía 'N' en este escenario (líneas 327-330)
                return Canto.NoQuiero;
            }

             // JS: if(suMesa === null){ ... } else { ... } -> Caso else es el relevante
             // if(suMesa !== null){ ... }
             switch(ultimoCantoTruco){
                 case Canto.Truco:
                     // Lógica original JS aquí era compleja y miraba la mano 0... if(this.gane(0) < 0) ... else ...
                     // Simplificación basada en la rama `else` del JS (perdí mano 1, pero gané mano 0):
                     // JS: if(posiblesCartas !== null && ... && posiblesCartas[0].valor <= this.cartasEnMano[0].valor) return 'RT';
                    const cartaOpMano0 = contexto.cartaJugadaOpMano0;
                    const cartaIAMano0 = contexto.cartaJugadaIAMano0; 

                     if (posiblesCartasOp && posiblesCartasOp.length > 0 && posiblesCartasOp[0].valor <= miCartaRestante.valor) return Canto.ReTruco; // Si mato su posible mejor carta, RT
                     // JS: if(this.cartasEnMano[0].valor >= 11) return 'RT';
                     if (miCartaRestante.valor >= 11) return Canto.ReTruco; // Si mi carta es >=3, RT
                     // JS: if(this.cartasEnMano[0].valor >= 9) return 'S';
                     if (miCartaRestante.valor >= 9) return Canto.Quiero; // Si mi carta es 2, S
                     // JS: if(this.cartasEnMano[0].valor >= 7) { if(this.puntosGanadosEnvido >= 3) return 'N'; else { ... heuristica ... } }
                     if (miCartaRestante.valor >= 7) { // Si mi carta es >=12
                        if (puntosEnvidoGanadosIA >= 3) return Canto.NoQuiero;
                        else {
                            // Aplicar heurística JS
                            if (cartaOpMano0 && cartaIAMano0 && (cartaIAMano0.valor - cartaOpMano0.valor > 3) && cartaOpMano0.valor > 7) {
                                return Canto.NoQuiero;
                            } else {
                                return Canto.Quiero;
                            }
                        }
                    }
                     // JS: return 'N';
                     return Canto.NoQuiero; // Si mi carta es <12

                 case Canto.ReTruco: // Oponente jugó, me ganó mano 1, y cantó RT
                     // JS: if(this.cartasEnMano[0].valor > suMesa.valor) return 'V'; else return 'N';
                      return (miCartaRestante.valor > cartaOp.valor) ? Canto.ValeCuatro : Canto.NoQuiero; // Si mato la carta que me ganó, V4 (agresivo!)
                 case Canto.ValeCuatro: // Oponente jugó, me ganó mano 1, y cantó V4
                      // JS: if(this.cartasEnMano[0].valor > suMesa.valor) return 'S'; else return 'N';
                     return (miCartaRestante.valor > cartaOp.valor) ? Canto.Quiero : Canto.NoQuiero; // Si mato la carta que me ganó, S
                default: return Canto.NoQuiero;
             }
         }
         // return Canto.NoQuiero; // Fallback
     }

    // --- Implementación Helpers Cantar/Escalar Truco (Traducción JS) ---

    private cantoTrucoMano0(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { misCartasEnMano } = contexto;
        const clasif = this.clasificarCartas(misCartasEnMano);
        const mediaalta = clasif.alta + clasif.media;
        // JS: if(mediaalta>=3)return'T';
        if (mediaalta >= 3) return Canto.Truco; // Si tengo 3 >= Media, Truco
        return Canto.Paso; // Sino, no canto
    }

    private cantoTrucoMano1(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { resultadoMano0, cartaOponenteEnMesa, misCartasEnMano } = contexto;
        const clasif = this.clasificarCartas(misCartasEnMano); // Cartas restantes
        const mediaalta = clasif.alta + clasif.media;
        const cartaOp = cartaOponenteEnMesa;

        if (resultadoMano0 > 0) { // Gané mano 0
            // JS: this.estrategiaDeJuego = this.estrategia1; --> Cambiar estrategia lo hace jugarCarta si detecta la condicion
            // JS: if (clasif.alta === 2) return 'T';
            if (clasif.alta === 2) return Canto.Truco; // Si tengo 2 Altas restantes -> T
            // JS: if (mediaalta === 2) return 'T';
            if (mediaalta === 2) return Canto.Truco; // Si tengo 2 >= Media restantes -> T
            // JS: if (clasif.baja === 1 && clasif.alta === 1) return '';
            if (clasif.baja === 1 && clasif.alta === 1) return Canto.Paso; // 1 Alta y 1 Baja -> Espero
             // JS: if (clasif.alta >= 1) return 'T';
            if (clasif.alta >= 1) return Canto.Truco; // Si tengo 1 Alta (y la otra es Media) -> T
            // JS: return '';
            return Canto.Paso; // Si tengo 2 Medias o peor -> Espero
        } else if (resultadoMano0 === 0) { // Empate mano 0
            // JS: if (suMesa !== null && this.laMato(suMesa) > -1 ) return 'T';
            if (cartaOp && this.laMato(cartaOp) > -1) return Canto.Truco; // Si oponente jugó y lo mato -> T
            // JS: if (suMesa !== null && suMesa.valor <= 7 ) return 'T';
            if (cartaOp && cartaOp.valor <= 7) return Canto.Truco; // Si oponente jugó <= Rey -> T
             // JS: if (mediaalta > 0 ) return 'T';
            if (mediaalta > 0) return Canto.Truco; // Si tengo >= Media -> T
            // JS: return '';
            return Canto.Paso; // Si tengo 2 Bajas -> Espero
        } else { // Perdí mano 0
            // JS: if(this.laMato(suMesa) !== -1 ){ ... } else { ... }
            if (!cartaOp) return Canto.Paso; // Oponente no jugó, espero
            const matoIdx = this.laMato(cartaOp);
            if (matoIdx !== -1) { // Puedo matarlo
                // JS: if(clasif.alta === 2) return 'T';
                if (clasif.alta === 2) return Canto.Truco; // Si lo mato y me quedan 2 Altas -> T
                // JS: if(mediaalta >= 1) return ''; --> ¿Seguro? Si lo mato y me queda otra buena...
                // Adaptación: Si lo mato y mi otra carta es >= Media, canto Truco.
                 if (misCartasEnMano.length === 2) {
                     const otraCartaIdx = 1 - matoIdx;
                     if (this.clasificar(misCartasEnMano[otraCartaIdx]) >= 1) return Canto.Truco;
                 }
                // JS: return '';
                return Canto.Paso; // Si lo mato pero mi otra carta es Baja -> Espero
            } else { // No puedo matarlo
                // JS: if(posiblesCartas !== null && suMesa.valor <= 4 && posiblesCartas.length > 0 && posiblesCartas[0].valor <= 6) return 'T';
                 if (posiblesCartasOp && cartaOp.valor <= 4 && posiblesCartasOp.length > 0 && posiblesCartasOp[0].valor <= 6) {
                    return Canto.Truco; // MENTIR: Si jugó <=5 y sospecho que su otra es <=A.falso, canto T
                 }
                // JS: return '';
                return Canto.Paso; // No puedo matar y no miento -> Espero
            }
        }
        // return Canto.Paso;
    }

    private cantoTrucoMano2(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
         const { resultadoMano1, cartaOponenteEnMesa, misCartasEnMano } = contexto;
         const ran = getRandomInt(0, 100);
         const cartaOp = cartaOponenteEnMesa;
         if (misCartasEnMano.length !== 1) console.error("Error lógico: Debería quedar 1 carta en mano 2");
         const miCartaRestante = misCartasEnMano[0];

         if (resultadoMano1 < 0) { // Perdí mano 1 (y la ronda)
            if (!cartaOp) return Canto.Paso; // Oponente no jugó, espero
             // JS: if(this.laMato(suMesa) !== -1) return 'T';
             // ¿Cantar Truco si puedo matar aunque ya perdí la ronda? Raro. Quizás para farolear? Mantengo lógica JS.
             if (this.laMato(cartaOp) !== -1) return Canto.Truco;
             // JS: if(posiblesCartas !== null && ... && this.laMato(posiblesCartas[0]) !== -1) return 'T';
            if (posiblesCartasOp && posiblesCartasOp.length > 0 && this.laMato(posiblesCartasOp[0]) !== -1) {
                return Canto.Truco; // Si creo que mato su mejor carta posible -> T (Farol)
            }
            // JS: if(ran <= 33 && suMesa.valor < 8) return 'T';
            if (ran <= 33 && cartaOp.valor < 8) return Canto.Truco; // Si jugó <Rey y random -> T (Farol)
            // JS: return '';
            return Canto.Paso;
         } else if (resultadoMano1 === 0) { // Empate mano 1 (define quien ganó mano 0)
             // JS: if (suMesa !== null && this.laMato(suMesa) > -1 ) return 'T';
             if (cartaOp && this.laMato(cartaOp) > -1) return Canto.Truco;
             // JS: if (suMesa !== null && suMesa.valor <= 7 ) return 'T';
             if (cartaOp && cartaOp.valor <= 7) return Canto.Truco;
             // JS: if (mediaalta > 0 ) return 'T'; -> mediaalta con 1 carta? usar clasificar
             if (this.clasificar(miCartaRestante) > 0) return Canto.Truco; // Si mi carta es >= Media -> T
             // JS: return '';
             return Canto.Paso;
         } else { // Gané mano 1 (y la ronda)
             // JS: if (this.cartasEnMano[0].valor >= 10) return 'T';
             if (miCartaRestante.valor >= 10) return Canto.Truco; // Si mi carta restante es >= 2 -> T
            // JS: if(posiblesCartas !== null && ... && this.laMato(posiblesCartas[0]) !== -1) return 'T';
            if (posiblesCartasOp && posiblesCartasOp.length > 0 && this.laMato(posiblesCartasOp[0]) !== -1) {
                return Canto.Truco; // Si creo que mato su mejor carta -> T
            }
             // JS: else (posiblesCartas !== null && ... && this.laMato(posiblesCartas[0]) === -1) return '';
             else if (posiblesCartasOp && posiblesCartasOp.length > 0 && this.laMato(posiblesCartasOp[0]) === -1) {
                 return Canto.Paso; // Si creo que no mato su mejor carta -> Espero
             }
             // JS: return ''; (Caso sin info de posiblesCartas)
             return Canto.Paso; // Default si no tengo >=2 y no sé de oponente -> Espero
         }
         // return Canto.Paso;
    }

    private escalarTrucoMano0(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
         const { ultimoCantoTruco, cartaOponenteEnMesa, misCartasEnMano } = contexto;
         const clasif = this.clasificarCartas(misCartasEnMano);
         const mediaalta = clasif.alta + clasif.media;
         const cartaOp = cartaOponenteEnMesa;

         // JS: if(suMesa !== null){ ... } else { ... }
         if (cartaOp) { // Oponente jugó
             const matoIdx = this.laMato(cartaOp);
             switch(ultimoCantoTruco){
                 case Canto.Truco: // Escalar a ReTruco?
                     // JS: if(mato !== -1){ if(clasif.alta === 2) return 'RT'; else return ''; } else { return ''; }
                     return (matoIdx !== -1 && clasif.alta === 2) ? Canto.ReTruco : Canto.Paso; // Si mato y tengo 2 Altas -> RT
                 case Canto.ReTruco: // Escalar a ValeCuatro?
                     // JS: if(mato !== -1){ if(clasif.alta === 2) return 'V'; else return ''; } else { return ''; }
                     return (matoIdx !== -1 && clasif.alta === 2) ? Canto.ValeCuatro : Canto.Paso; // Si mato y tengo 2 Altas -> V4
                 default: return Canto.Paso; // No debería escalar desde V4
             }
         } else { // Oponente no jugó (IA es mano y cantó Truco/RT, Oponente respondió Quiero)
             switch(ultimoCantoTruco){
                 case Canto.Truco: // IA cantó T, Oponente Q -> ¿Escalo a RT?
                      // Lógica JS no clara aquí. Asumo que no escalo sin ver carta.
                      return Canto.Paso;
                 case Canto.ReTruco: // IA cantó RT, Oponente Q -> ¿Escalo a V4?
                     // JS: if(clasif.alta >= 2) return 'V'; if(mediaalta >= 2) return '';
                     if(clasif.alta >= 2) return Canto.ValeCuatro; // Si tengo 2 Altas -> V4
                     // Si tengo 2 Medias, espero (según JS)
                     return Canto.Paso;
                 default: return Canto.Paso;
             }
         }
    }

    private escalarTrucoMano1(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        const { ultimoCantoTruco, resultadoMano0, cartaOponenteEnMesa, misCartasEnMano } = contexto;
        const clasif = this.clasificarCartas(misCartasEnMano); // Cartas restantes
        const mediaalta = clasif.alta + clasif.media;
        const cartaOp = cartaOponenteEnMesa;

        if (resultadoMano0 > 0) { // Gané mano 0
            switch(ultimoCantoTruco){
                case Canto.Truco: // Escalar a RT?
                    // JS: if (clasif.alta >= 1) return 'RT'; else return '';
                    return (clasif.alta >= 1) ? Canto.ReTruco : Canto.Paso; // Si tengo >=1 Alta -> RT
                case Canto.ReTruco: // Escalar a V4?
                    // JS: if (clasif.alta >= 1) return 'V'; else return '';
                    return (clasif.alta >= 1) ? Canto.ValeCuatro : Canto.Paso; // Si tengo >=1 Alta -> V4
                default: return Canto.Paso; // No escalar V4
            }
        } else if (resultadoMano0 === 0) { // Empate mano 0
            // JS: if (suMesa !== null && this.laMato(suMesa) > -1 ) return (ultimo === 'T' ? 'RT' : 'V');
            if (cartaOp && this.laMato(cartaOp) > -1) return (ultimoCantoTruco === Canto.Truco) ? Canto.ReTruco : Canto.ValeCuatro; // Si mato -> Escalo
             // JS: if (clasif.alta > 0 ) return (ultimo === 'T' ? 'RT' : 'V');
            if (clasif.alta > 0) return (ultimoCantoTruco === Canto.Truco) ? Canto.ReTruco : Canto.ValeCuatro; // Si tengo Alta -> Escalo
            // JS: return '';
            return Canto.Paso;
        } else { // Perdí mano 0
             if (!cartaOp) return Canto.Paso; // Espero a que juegue oponente
             const matoIdx = this.laMato(cartaOp);
             if (matoIdx !== -1) { // Puedo matarlo
                 switch(ultimoCantoTruco){
                    case Canto.Truco: // Escalar a RT?
                         // JS: if (mediaalta >= 2 && clasif.alta >= 1) return 'RT'; else return '';
                         return (mediaalta >= 2 && clasif.alta >= 1) ? Canto.ReTruco : Canto.Paso; // Si mato Y tengo (A,M) o (A,A) -> RT
                    case Canto.ReTruco: // Escalar a V4?
                         // JS: if (clasif.alta >= 2) return 'V'; else return '';
                         return (clasif.alta >= 2) ? Canto.ValeCuatro : Canto.Paso; // Si mato Y tengo (A,A) -> V4
                    default: return Canto.Paso;
                 }
             } else { // No puedo matarlo
                // JS: switch(ultimo){ case 'T': case 'RT': case 'V': return ''; } -> No escala si no mata
                 return Canto.Paso;
             }
        }
        // return Canto.Paso;
    }

    private escalarTrucoMano2(contexto: TrucoContext, posiblesCartasOp: Naipe[] | null): Canto {
        // ... (Implementación basada en JS original, como en la respuesta anterior) ...
         const { ultimoCantoTruco, resultadoMano1, cartaOponenteEnMesa, misCartasEnMano } = contexto;
         if (!misCartasEnMano || misCartasEnMano.length !== 1) return Canto.Paso;
         const miCartaRestante = misCartasEnMano[0];
         const clasif = this.clasificarCartas(misCartasEnMano); // alta es 0 o 1
         const cartaOp = cartaOponenteEnMesa;
         const nextCanto = (ultimoCantoTruco === Canto.Truco) ? Canto.ReTruco : Canto.ValeCuatro;

         if (resultadoMano1 > 0) { // Gané mano 1 (y ronda)
             switch(ultimoCantoTruco){
                 case Canto.Truco: return (clasif.alta === 1) ? Canto.ReTruco : Canto.Paso;
                 case Canto.ReTruco: return (miCartaRestante.valor >= 13) ? Canto.ValeCuatro : Canto.Paso;
                 default: return Canto.Paso;
             }
         } else if (resultadoMano1 === 0) { // Empate mano 1
             if (cartaOp && this.laMato(cartaOp) > -1) return nextCanto;
             if (clasif.alta > 0) return nextCanto;
             return Canto.Paso;
         } else { // Perdí mano 1 (y ronda)
             if (!cartaOp) return Canto.Paso;
              switch(ultimoCantoTruco){
                 case Canto.Truco: return (cartaOp.valor < miCartaRestante.valor || cartaOp.valor < 9) ? Canto.ReTruco : Canto.Paso;
                 case Canto.ReTruco: return (cartaOp.valor < miCartaRestante.valor) ? Canto.ValeCuatro : Canto.Paso;
                 default: return Canto.Paso;
             }
         }
    }
    // ia.ts (o desarrolloia.ts)

    // --- Método Principal para Jugar Carta ---
    public jugarCarta(ronda: Ronda): Naipe { // Recibe la ronda actual

        // Determinar si se debe cambiar la estrategia (basado en la lógica de truco JS)
        // Ejemplo simplificado (la lógica original en JS estaba más dispersa):
        // const contextoTruco = ronda.crearContextoTruco(this); // Necesitamos un método en Ronda para esto
        // if (contextoTruco.nroMano === 1 && contextoTruco.resultadoMano0 > 0) {
        //     // Si gané primera, podría aplicar estrategia1
        //     // La lógica original la activaba DENTRO de truco, revisar si es mejor aquí
        // } else {
        //     this.estrategiaDeJuego = this.estrategiaClasica; // Volver a la clásica por defecto
        // }

        // Llama a la estrategia actual para obtener el ÍNDICE
        const indice = this.estrategiaDeJuego(ronda); // Pasar la ronda a la estrategia

        if (indice < 0 || indice >= this.cartasEnMano.length) {
            console.error(`[IA ${this.nombre}] Estrategia devolvió índice inválido: ${indice}. Jugando la primera carta.`);
            if (this.cartasEnMano.length === 0) throw new Error("IA no tiene cartas para jugar.");
             const cartaFallback = this.cartasEnMano[0];
             // Registrar la carta jugada
             this.registrarCartaJugadaIA(cartaFallback); // Llama al método de Jugador
             return cartaFallback;

        }

        const carta = this.cartasEnMano[indice];

        // Registrar la carta jugada (eliminarla de la mano y añadirla a jugadas)
        // La lógica original de JS hacía splice directo. Usaremos el método heredado.
        const registrada = this.registrarCartaJugadaIA(carta);
        if (!registrada) {
            // Esto no debería pasar si el índice es válido
             console.error(`[IA ${this.nombre}] Error al registrar carta ${carta.getNombre()} con índice ${indice}. Jugando la primera.`);
             if (this.cartasEnMano.length === 0) throw new Error("IA no tiene cartas para jugar.");
             const cartaFallback = this.cartasEnMano[0];
             this.registrarCartaJugadaIA(cartaFallback);
             return cartaFallback;
        }


        // Log (esto podría hacerlo Ronda o UIHandler)
        // console.log(`[IA ${this.nombre}] Juega: ${carta.getNombre()}`);

        return carta;
    }

    // --- Estrategias (Traducción de JS) ---

    /** Estrategia Clásica: Lógica por defecto */
    private estrategiaClasica(ronda: Ronda): number {
        const equipoIA = ronda.getEquipo(this);
        if (!equipoIA) throw new Error("No se encontró el equipo de la IA en la ronda.");
        const oponente = ronda.getOponente(equipoIA);

        // Ajuste: Determinar si soy el primero en jugar en esta mano
        const esPrimeroEnMano = ronda.jugadasEnMano === 0 || ronda.jugadasEnMano === equipoIA.jugador.cartasJugadasRonda.length;
        const nroManoActual = ronda.numeroDeMano;
        let cartaOponenteMano: Naipe | undefined;

        // Obtener carta del oponente si ya jugó en esta mano
        if (!esPrimeroEnMano && oponente.jugador.cartasJugadasRonda.length > equipoIA.jugador.cartasJugadasRonda.length) {
            cartaOponenteMano = getLast(oponente.jugador.cartasJugadasRonda);
        }

        let indice = -1;
        const clasif = this.clasificarCartas(this.cartasEnMano);

        if (cartaOponenteMano) { // Oponente ya jugó en esta mano
            indice = this.elegir(1, cartaOponenteMano); // Busca la más chica que mate
            if (indice < 0) {
                indice = this.elegir(0); // No puedo matar, juego la más baja
            } else {
                const cartaQueMata = this.cartasEnMano[indice];
                if (nroManoActual === 0 && cartaQueMata.valor >= 11 && cartaOponenteMano.valor <= 7) {
                    // Heurística mano 0: Guardo carta alta si mato a una baja
                    const indiceBaja = this.elegir(0); // Intentar jugar la más baja
                    if (indiceBaja !== -1) indice = indiceBaja; // Jugar la baja si existe
                }
            }
        } else { // Soy primero en jugar en esta mano (o el oponente no ha jugado aún)
            switch (nroManoActual) {
                case 0: // Primera mano
                    if (clasif.alta >= 2) {
                        indice = this.elegir(0); // Tengo >=2 Altas, juego la más baja
                    } else if (clasif.alta >= 1) {
                        indice = this.elegir(1, null, 1); // Tengo 1 Alta, juego la más alta de las Medias
                        if (indice < 0) indice = this.elegir(1, null, 0); // Si no hay Medias, juego la más alta de las Bajas
                        if (indice < 0) indice = this.elegir(1); // Fallback si solo queda la alta
                    } else {
                        indice = this.elegir(1); // No tengo Altas, juego la más alta que tenga
                    }
                    break;
                case 1: // Segunda mano
                    // Comparar manos ganadas hasta ahora
                    const manosIA = equipoIA.manosGanadasRonda; // Necesita esta propiedad en Equipo
                    const manosOp = oponente.manosGanadasRonda; // Necesita esta propiedad en Equipo

                    if (manosIA > manosOp) { // Gané primera
                        indice = this.elegir(0); // Juego la más baja
                    } else { // Perdí o empardé primera
                        indice = this.elegir(1); // Juego la más alta
                    }
                    break;
                case 2: // Tercera mano
                    indice = 0; // Solo queda una carta
                    break;
            }
        }

        // Fallback final
        if (indice === -1 && this.cartasEnMano.length > 0) {
            console.warn(`[IA ${this.nombre}] Estrategia Clásica no pudo decidir. Jugando índice 0.`);
            indice = 0;
        } else if (indice === -1 && this.cartasEnMano.length === 0) {
            throw new Error(`[IA ${this.nombre}] Error en estrategia: No hay cartas en mano y el índice es -1.`);
        }

        return indice;
    }

    /** Estrategia 1: Usada en circunstancias específicas (ganar primera mano) */
    private estrategia1(ronda: Ronda): number { // Recibe la ronda
        // Esta estrategia se activaba en JS dentro de truco() si ganaba primera.
        // Su lógica principal parece ser jugar la carta más alta si tiene una baja y una media.
        const clasif = this.clasificarCartas(this.cartasEnMano);

        // JS: if(clasif.baja === 1 && clasif.media === 1){ return (this.cartasEnMano[0].valor < this.cartasEnMano[1].valor) ? 1 : 0; }
        if (this.cartasEnMano.length === 2 && clasif.baja === 1 && clasif.media === 1) {
            // Si tengo exactamente una baja y una media, juego la media (la más alta)
            return (this.cartasEnMano[0].valor < this.cartasEnMano[1].valor) ? 1 : 0; // Devuelve índice de la de mayor valor
        }

        // JS: return this.estrategiaClasica();
        // Si no se cumple la condición, usa la estrategia clásica
        return this.estrategiaClasica(ronda);
    }
}
// --- Fin Implementación Helpers Cantar/Escalar Truco (Traducción JS) ---