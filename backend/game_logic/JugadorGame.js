class JugadorGame {
    /**
     * @param {number} id El ID del usuario (de la tabla usuarios).
     * @param {string} nombreUsuario El nombre del usuario.
     * @param {string} equipoId El ID del equipo al que pertenece.
     */
    constructor(id, nombreUsuario, equipoId) {
        this.id = id; // Corresponde al usuario_id de la DB
        this.nombreUsuario = nombreUsuario;
        this.cartasMano = [];
        this.cartasJugadasRonda = []; // Cartas que ha jugado en la ronda actual
        this.equipoId = equipoId; // Para saber a qué equipo pertenece
        this.esPie = false; // Si es el último en jugar de su equipo (relevante para 2v2, 3v3)
        this.ordenEnEquipo = 0; // Para 3v3, podría ser 1, 2, 3
        this.estadoConexion = 'conectado'; // 'conectado', 'desconectado'
    }

    recibirCartas(cartas) {
        this.cartasMano = cartas;
        this.cartasJugadasRonda = []; // Limpiar al recibir nueva mano
    }

    jugarCarta(idUnicoCarta) {
        const indiceCarta = this.cartasMano.findIndex(c => c.idUnico === idUnicoCarta);
        if (indiceCarta === -1) {
            console.error(`Error: El jugador ${this.nombreUsuario} no tiene la carta ${idUnicoCarta}`);
            return null; // O lanzar un error
        }
        const cartaJugada = this.cartasMano.splice(indiceCarta, 1)[0];
        this.cartasJugadasRonda.push(cartaJugada);
        return cartaJugada;
    }

    obtenerCartaPorId(idUnicoCarta) {
        return this.cartasMano.find(c => c.idUnico === idUnicoCarta);
    }

    limpiarParaNuevaRonda() {
        this.cartasMano = [];
        this.cartasJugadasRonda = [];
    }

    // Podríamos añadir métodos para calcular el envido del jugador aquí
    // o hacerlo en la clase RondaGame/PartidaGame pasándole las cartas.
    calcularEnvido() {
        if (this.cartasMano.length === 0) return 0;

        let envidoMaximo = 0;
        const palos = {};

        this.cartasMano.forEach(carta => {
            if (!palos[carta.palo]) {
                palos[carta.palo] = [];
            }
            palos[carta.palo].push(carta.valorEnvido === 0 ? 0 : carta.valorEnvido); // Figuras valen 0 para envido
        });

        for (const palo in palos) {
            if (palos[palo].length >= 2) {
                palos[palo].sort((a, b) => b - a); // Ordenar descendente
                let envidoActual = 20;
                if (palos[palo][0] === 0 && palos[palo][1] === 0) { // Dos figuras del mismo palo
                    envidoActual += 0; // Ya es 20
                } else if (palos[palo][0] === 0 || palos[palo][1] === 0) { // Una figura y una carta
                     envidoActual += palos[palo][0] === 0 ? palos[palo][1] : palos[palo][0];
                } else {
                    envidoActual += palos[palo][0] + palos[palo][1];
                }
                if (envidoActual > envidoMaximo) {
                    envidoMaximo = envidoActual;
                }
            }
        }

        // Si no hay dos cartas del mismo palo, el envido es la carta más alta.
        if (envidoMaximo === 0 && this.cartasMano.length > 0) {
            let maxValorCartaSola = 0;
            this.cartasMano.forEach(carta => {
                if (carta.valorEnvido > maxValorCartaSola) {
                    maxValorCartaSola = carta.valorEnvido;
                }
            });
            return maxValorCartaSola;
        }
        return envidoMaximo;
    }
}

module.exports = JugadorGame;