/**
 * Genera un número entero aleatorio entre min (incluido) y max (incluido).
 */
export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Baraja un array en el lugar usando el algoritmo Fisher-Yates.
 * @param array Array a barajar.
 */
export function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Intercambio de elementos
    }
}

/**
 * Obtiene el último elemento de un array o undefined si está vacío.
 * @param arr El array.
 * @returns El último elemento o undefined.
 */
export function getLast<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}