// src/utils/cardImageUtils.ts

/**
 * Utilidad centralizada para manejo de imágenes de cartas
 */

interface Carta {
  numero: number;
  palo: string;
  idUnico?: string;
  valorEnvido?: number;
  valorTruco?: number;
  estaJugada?: boolean;
}

/**
 * Mapeo de palos desde el formato del juego al formato de archivos
 */
const PALO_MAPPING: Record<string, string> = {
  'oro': 'Gold',
  'copa': 'Cups', 
  'espada': 'Swords',
  'basto': 'Bastos',
  // Variaciones en minúsculas
  'Oro': 'Gold',
  'Copa': 'Cups',
  'Espada': 'Swords', 
  'Basto': 'Bastos',
  // Variaciones plurales
  'oros': 'Gold',
  'copas': 'Cups',
  'espadas': 'Swords',
  'bastos': 'Bastos'
};

/**
 * Obtiene el nombre del archivo de imagen para una carta
 * @param carta - La carta
 * @returns string - Nombre del archivo (sin extensión)
 */
export function getCardImageFileName(carta: Carta): string {
  const paloFile = PALO_MAPPING[carta.palo.toLowerCase()] || carta.palo;
  return `${carta.numero}${paloFile}`;
}

/**
 * Obtiene la ruta completa de la imagen de una carta
 * @param carta - La carta
 * @param skinName - Nombre del skin/mazo (ej: 'Original', 'PixelArt', etc.)
 * @returns string - Ruta completa a la imagen
 */
export function getCardImagePath(carta: Carta, skinName: string = 'Original'): string {
  const fileName = getCardImageFileName(carta);
  const skinFolder = getSkinFolder(skinName);
  return `/cartas/${skinFolder}/${fileName}.jpg`;
}

/**
 * Obtiene la ruta de fallback si falla la imagen principal
 * @param carta - La carta
 * @returns string - Ruta de fallback
 */
export function getCardImageFallback(carta: Carta): string {
  return getCardImagePath(carta, 'Original');
}

/**
 * Obtiene la ruta de la imagen del dorso de carta
 * @param skinName - Nombre del skin/mazo
 * @returns string - Ruta al dorso
 */
export function getCardBackImagePath(skinName: string = 'Original'): string {
  const skinFolder = getSkinFolder(skinName);
  return `/cartas/${skinFolder}/reverse.png`;
}

/**
 * Mapeo de nombres de skins a carpetas reales
 */
const SKIN_FOLDER_MAPPING: Record<string, string> = {
  'Original': 'mazoOriginal',
  'OG': 'mazoOG', 
  'PixelArt': 'mazoPixelArt',
  'Wikipedia': 'mazoWikipedia'
};

/**
 * Obtiene las rutas disponibles de skins/mazos
 * @returns string[] - Array de nombres de skins disponibles
 */
export function getAvailableSkins(): string[] {
  return Object.keys(SKIN_FOLDER_MAPPING);
}

/**
 * Obtiene el nombre de la carpeta para un skin
 * @param skinName - Nombre del skin
 * @returns string - Nombre de la carpeta
 */
export function getSkinFolder(skinName: string): string {
  return SKIN_FOLDER_MAPPING[skinName] || SKIN_FOLDER_MAPPING['Original'];
}

/**
 * Valida si un nombre de skin es válido
 * @param skinName - Nombre del skin a validar
 * @returns boolean - true si es válido
 */
export function isValidSkin(skinName: string): boolean {
  return getAvailableSkins().includes(skinName);
}

/**
 * Normaliza el nombre de un skin
 * @param skinName - Nombre del skin a normalizar
 * @returns string - Nombre normalizado
 */
export function normalizeSkinName(skinName: string): string {
  if (!skinName || !isValidSkin(skinName)) {
    return 'Original';
  }
  return skinName;
}

/**
 * Obtiene información detallada de una carta para debugging
 * @param carta - La carta
 * @returns object - Información detallada
 */
export function getCardDebugInfo(carta: Carta) {
  return {
    numero: carta.numero,
    palo: carta.palo,
    paloMapeado: PALO_MAPPING[carta.palo.toLowerCase()] || carta.palo,
    nombreArchivo: getCardImageFileName(carta),
    rutaCompleta: getCardImagePath(carta),
    rutaFallback: getCardImageFallback(carta)
  };
}
