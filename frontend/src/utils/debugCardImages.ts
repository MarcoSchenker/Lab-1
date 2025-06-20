// src/utils/debugCardImages.ts

import { getCardImagePath, getCardImageFallback, getAvailableSkins, normalizeSkinName } from './cardImageUtils';

interface Carta {
  numero: number;
  palo: string;
  idUnico?: string;
}

/**
 * Función para debuggear las rutas de imágenes de cartas
 */
export function debugCardImage(carta: Carta, skinName: string = 'Original') {
  const normalizedSkin = normalizeSkinName(skinName);
  const imagePath = getCardImagePath(carta, normalizedSkin);
  const fallbackPath = getCardImageFallback(carta);
  
  console.group(`🃏 Debug Carta: ${carta.numero} de ${carta.palo}`);
  console.log('Skin solicitada:', skinName);
  console.log('Skin normalizada:', normalizedSkin);
  console.log('Ruta principal:', imagePath);
  console.log('Ruta fallback:', fallbackPath);
  console.log('URL completa:', window.location.origin + imagePath);
  console.groupEnd();
  
  return {
    carta,
    skinName,
    normalizedSkin,
    imagePath,
    fallbackPath,
    fullUrl: window.location.origin + imagePath
  };
}

/**
 * Función para probar todas las cartas de un mazo/skin
 */
export function debugAllCardsInSkin(skinName: string = 'Original') {
  const palos = ['oro', 'copa', 'espada', 'basto'];
  const numeros = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  
  console.group(`🎴 Debug Mazo Completo: ${skinName}`);
  console.log('Skins disponibles:', getAvailableSkins());
  
  const results: any[] = [];
  
  palos.forEach(palo => {
    console.group(`${palo.toUpperCase()} (${palo})`);
    
    numeros.forEach(numero => {
      const carta: Carta = { numero, palo };
      const debug = debugCardImage(carta, skinName);
      results.push(debug);
    });
    
    console.groupEnd();
  });
  
  console.log('Resumen:', results.length, 'cartas procesadas');
  console.groupEnd();
  
  return results;
}

/**
 * Función para verificar si una imagen existe (usando fetch)
 */
export async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Función para verificar todas las imágenes de un mazo
 */
export async function verifyAllImagesInSkin(skinName: string = 'Original') {
  const palos = ['oro', 'copa', 'espada', 'basto'];
  const numeros = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  
  console.group(`🔍 Verificando Imágenes - Mazo: ${skinName}`);
  
  const results = {
    total: 0,
    found: 0,
    missing: 0,
    errors: [] as string[]
  };
  
  for (const palo of palos) {
    for (const numero of numeros) {
      const carta: Carta = { numero, palo };
      const imagePath = getCardImagePath(carta, skinName);
      const fullUrl = window.location.origin + imagePath;
      
      results.total++;
      
      try {
        const exists = await checkImageExists(fullUrl);
        if (exists) {
          results.found++;
          console.log(`✅ ${numero} de ${palo}`);
        } else {
          results.missing++;
          results.errors.push(`❌ ${numero} de ${palo} - ${imagePath}`);
          console.error(`❌ ${numero} de ${palo} - No encontrada: ${imagePath}`);
        }
      } catch (error) {
        results.missing++;
        results.errors.push(`❌ ${numero} de ${palo} - Error: ${error}`);
        console.error(`❌ ${numero} de ${palo} - Error:`, error);
      }
    }
  }
  
  console.log(`📊 Resumen:
    Total: ${results.total}
    Encontradas: ${results.found} (${Math.round((results.found / results.total) * 100)}%)
    Faltantes: ${results.missing} (${Math.round((results.missing / results.total) * 100)}%)`);
  
  if (results.errors.length > 0) {
    console.group('❌ Errores detectados:');
    results.errors.forEach(error => console.log(error));
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return results;
}

// Funciones globales para usar en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugCardImage = debugCardImage;
  (window as any).debugAllCardsInSkin = debugAllCardsInSkin;
  (window as any).verifyAllImagesInSkin = verifyAllImagesInSkin;
}
