const DEFAULT_SKIN = 'Original';

const SKIN_CODE_TO_NAME = {
  original: 'Original',
  og: 'OG',
  pixelart: 'PixelArt',
  wikipedia: 'Wikipedia'
};

/**
 * Normaliza cualquier valor de skin recibido desde la base de datos o solicitudes del cliente
 * para que coincida con los nombres esperados por el frontend.
 * @param {string | null | undefined} skinValue Valor de skin (código o nombre)
 * @returns {string} Nombre de skin normalizado
 */
function normalizeSkinName(skinValue) {
  if (!skinValue || typeof skinValue !== 'string') {
    return DEFAULT_SKIN;
  }

  const trimmed = skinValue.trim();
  if (!trimmed) {
    return DEFAULT_SKIN;
  }

  const lower = trimmed.toLowerCase();

  if (SKIN_CODE_TO_NAME[lower]) {
    return SKIN_CODE_TO_NAME[lower];
  }

  // Si ya viene con el nombre "bonito", respetarlo (comparación case-insensitive)
  const existingName = Object.values(SKIN_CODE_TO_NAME)
    .find(name => name.toLowerCase() === lower);

  return existingName || DEFAULT_SKIN;
}

module.exports = {
  normalizeSkinName,
  DEFAULT_SKIN
};
