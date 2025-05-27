/**
 * Representa a un equipo dentro de la lógica del juego.
 */
class EquipoGame {
    /**
     * @param {string} id El ID del equipo (e.g., 'equipo_1', 'equipo_2').
     * @param {string} nombre El nombre del equipo.
     */
    constructor(id, nombre) {
        this.id = id;
        this.nombre = nombre;
        this.jugadores = []; // Array de objetos JugadorGame
        this.puntosPartida = 0;
    }

    agregarJugador(jugador) {
        this.jugadores.push(jugador);
        jugador.equipoId = this.id; // Asegurar que el jugador sepa a qué equipo pertenece
    }

    obtenerJugadorPorId(usuarioId) {
        return this.jugadores.find(j => j.id === usuarioId);
    }

    sumarPuntos(puntos) {
        this.puntosPartida += puntos;
    }

    // Podría tener métodos para obtener el pie del equipo, etc.
    // o para determinar el orden de juego dentro del equipo.
}

module.exports = EquipoGame;