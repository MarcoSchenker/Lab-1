// Utilidad para calcular automáticamente el envido del jugador
// Evita que el jugador pueda declarar puntos incorrectos

interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

/**
 * Calcula el envido de un jugador basado en sus cartas
 * @param cartas Las cartas del jugador
 * @returns El valor del envido (0-33)
 */
export function calcularEnvido(cartas: Carta[]): number {
  if (!cartas || cartas.length === 0) {
    return 0;
  }

  // Agrupar cartas por palo
  const cartasPorPalo: Record<string, Carta[]> = {};
  
  cartas.forEach(carta => {
    if (!cartasPorPalo[carta.palo]) {
      cartasPorPalo[carta.palo] = [];
    }
    cartasPorPalo[carta.palo].push(carta);
  });

  let mejorEnvido = 0;

  // Revisar cada palo
  Object.values(cartasPorPalo).forEach(cartasDelPalo => {
    if (cartasDelPalo.length >= 2) {
      // Si hay 2 o más cartas del mismo palo, calcular envido
      // Ordenar por valor de envido descendente
      const cartasOrdenadas = cartasDelPalo
        .sort((a, b) => b.valorEnvido - a.valorEnvido);
      
      // Tomar las dos mejores cartas del palo
      const valorEnvido = 20 + cartasOrdenadas[0].valorEnvido + cartasOrdenadas[1].valorEnvido;
      
      if (valorEnvido > mejorEnvido) {
        mejorEnvido = valorEnvido;
      }
    } else if (cartasDelPalo.length === 1) {
      // Si solo hay una carta de este palo, su valor de envido es su valor individual
      const valorEnvido = cartasDelPalo[0].valorEnvido;
      
      if (valorEnvido > mejorEnvido) {
        mejorEnvido = valorEnvido;
      }
    }
  });

  return mejorEnvido;
}

/**
 * Obtiene una descripción textual del envido
 * @param envido El valor del envido
 * @returns Descripción del envido
 */
export function obtenerDescripcionEnvido(envido: number): string {
  if (envido === 0) return "Sin envido";
  if (envido < 20) return `${envido} de envido`;
  
  const puntos = envido - 20;
  if (puntos === 13) return "33 (buenas)";
  return `${envido} de envido`;
}

/**
 * Valida si un valor de envido declarado es correcto
 * @param envidoDeclarado El envido que declara el jugador
 * @param cartas Las cartas reales del jugador
 * @returns true si el envido es correcto
 */
export function validarEnvidoDeclarado(envidoDeclarado: number, cartas: Carta[]): boolean {
  const envidoReal = calcularEnvido(cartas);
  return envidoReal === envidoDeclarado;
}

/**
 * Obtiene las cartas que forman el mejor envido
 * @param cartas Las cartas del jugador
 * @returns Las dos cartas que forman el mejor envido, o null si no hay envido
 */
export function obtenerCartasEnvido(cartas: Carta[]): { cartas: Carta[], palo: string } | null {
  if (!cartas || cartas.length === 0) {
    return null;
  }

  // Agrupar cartas por palo
  const cartasPorPalo: Record<string, Carta[]> = {};
  
  cartas.forEach(carta => {
    if (!cartasPorPalo[carta.palo]) {
      cartasPorPalo[carta.palo] = [];
    }
    cartasPorPalo[carta.palo].push(carta);
  });

  let mejorEnvido = 0;
  let mejoresCartas: Carta[] = [];
  let mejorPalo = '';

  // Revisar cada palo
  Object.entries(cartasPorPalo).forEach(([palo, cartasDelPalo]) => {
    if (cartasDelPalo.length >= 2) {
      // Si hay 2 o más cartas del mismo palo, calcular envido
      // Ordenar por valor de envido descendente
      const cartasOrdenadas = cartasDelPalo
        .sort((a, b) => b.valorEnvido - a.valorEnvido);
      
      // Tomar las dos mejores cartas del palo
      const valorEnvido = 20 + cartasOrdenadas[0].valorEnvido + cartasOrdenadas[1].valorEnvido;
      
      if (valorEnvido > mejorEnvido) {
        mejorEnvido = valorEnvido;
        mejoresCartas = [cartasOrdenadas[0], cartasOrdenadas[1]];
        mejorPalo = palo;
      }
    } else if (cartasDelPalo.length === 1) {
      // Si solo hay una carta de este palo, su valor de envido es su valor individual
      const valorEnvido = cartasDelPalo[0].valorEnvido;
      
      if (valorEnvido > mejorEnvido && mejoresCartas.length === 0) {
        mejorEnvido = valorEnvido;
        mejoresCartas = [cartasDelPalo[0]];
        mejorPalo = palo;
      }
    }
  });

  return mejoresCartas.length > 0 ? { cartas: mejoresCartas, palo: mejorPalo } : null;
}
