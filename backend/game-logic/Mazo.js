const Naipe = require('./Naipe');

const PALOS = ['espada', 'basto', 'oro', 'copa'];
const NUMEROS_Y_VALORES = [
    // numero, valorTruco, valorEnvido
    { numero: 1, valorTruco: 13, valorEnvido: 1, nombreUnico: '1' }, // Ancho de Espada (más fuerte)
    { numero: 1, valorTruco: 12, valorEnvido: 1, nombreUnico: '1' }, // Ancho de Basto
    { numero: 7, valorTruco: 11, valorEnvido: 7, nombreUnico: '7' }, // Siete de Espada
    { numero: 7, valorTruco: 10, valorEnvido: 7, nombreUnico: '7' }, // Siete de Oro
    { numero: 3, valorTruco: 9, valorEnvido: 3, nombreUnico: '3' },
    { numero: 2, valorTruco: 8, valorEnvido: 2, nombreUnico: '2' },
    { numero: 1, valorTruco: 7, valorEnvido: 1, nombreUnico: '1-falso' }, // Anchos falsos (Oro y Copa)
    { numero: 12, valorTruco: 6, valorEnvido: 0, nombreUnico: '12' },
    { numero: 11, valorTruco: 5, valorEnvido: 0, nombreUnico: '11' },
    { numero: 10, valorTruco: 4, valorEnvido: 0, nombreUnico: '10' },
    { numero: 7, valorTruco: 3, valorEnvido: 7, nombreUnico: '7-falso' }, // Sietes falsos (Basto y Copa)
    { numero: 6, valorTruco: 2, valorEnvido: 6, nombreUnico: '6' },
    { numero: 5, valorTruco: 1, valorEnvido: 5, nombreUnico: '5' },
    { numero: 4, valorTruco: 0, valorEnvido: 4, nombreUnico: '4' },
];

class Mazo {
    constructor() {
        this.cartas = [];
        this.crearMazo();
        this.mezclar();
    }

    crearMazo() {
        this.cartas = [];
        for (const palo of PALOS) {
            for (const numVal of NUMEROS_Y_VALORES) {
                // Ajustes específicos para los valores de Truco según el palo
                let valorTrucoEspecifico = numVal.valorTruco;
                let idUnico = `${numVal.nombreUnico}-${palo}`;

                if (numVal.numero === 1 && palo === 'espada') valorTrucoEspecifico = 14; // Matador: Ancho de Espada
                else if (numVal.numero === 1 && palo === 'basto') valorTrucoEspecifico = 13;
                else if (numVal.numero === 7 && palo === 'espada') valorTrucoEspecifico = 12;
                else if (numVal.numero === 7 && palo === 'oro') valorTrucoEspecifico = 11;
                else if (numVal.numero === 3) valorTrucoEspecifico = 10; // Todos los 3
                else if (numVal.numero === 2) valorTrucoEspecifico = 9;  // Todos los 2
                else if (numVal.numero === 1 && (palo === 'oro' || palo === 'copa')) valorTrucoEspecifico = 8; // Anchos falsos
                else if (numVal.numero === 12) valorTrucoEspecifico = 7; // Todos los 12
                else if (numVal.numero === 11) valorTrucoEspecifico = 6; // Todos los 11
                else if (numVal.numero === 10) valorTrucoEspecifico = 5; // Todos los 10
                else if (numVal.numero === 7 && (palo === 'basto' || palo === 'copa')) valorTrucoEspecifico = 4; // Sietes falsos
                else if (numVal.numero === 6) valorTrucoEspecifico = 3; // Todos los 6
                else if (numVal.numero === 5) valorTrucoEspecifico = 2; // Todos los 5
                else if (numVal.numero === 4) valorTrucoEspecifico = 1; // Todos los 4 (los más bajos)

                this.cartas.push(new Naipe(palo, numVal.numero, valorTrucoEspecifico, numVal.valorEnvido, idUnico));
            }
        }
        // Filtrar para tener solo 40 cartas (eliminar 8s y 9s si se generaron, o ajustar NUMEROS_Y_VALORES)
        // El array NUMEROS_Y_VALORES ya está diseñado para 40 cartas (no incluye 8s ni 9s).
    }

    mezclar() {
        for (let i = this.cartas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cartas[i], this.cartas[j]] = [this.cartas[j], this.cartas[i]];
        }
    }

    repartir(cantidad) {
        if (cantidad > this.cartas.length) {
            // Idealmente, esto no debería pasar si se reinicia el mazo por ronda.
            console.warn("No hay suficientes cartas para repartir.");
            return [];
        }
        return this.cartas.splice(0, cantidad);
    }

    get cantidadCartas() {
        return this.cartas.length;
    }
}

module.exports = Mazo;