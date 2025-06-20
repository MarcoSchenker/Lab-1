const Naipe = require('./Naipe');

const PALOS = ['espada', 'basto', 'oro', 'copa'];
// Standard Truco deck: 40 cards (no 8s or 9s)
const NUMEROS_VALIDOS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

class Mazo {
    constructor() {
        this.cartas = [];
        this.crearMazo();
        this.mezclar();
    }

    crearMazo() {
        this.cartas = [];
        for (const palo of PALOS) {
            for (const numero of NUMEROS_VALIDOS) {
                let valorTruco, valorEnvido, idUnico;
                
                // Set envido value (figures are 0, numbers are face value)
                valorEnvido = (numero >= 10) ? 0 : numero;
                
                // Set truco value and unique ID based on specific card
                if (numero === 1 && palo === 'espada') {
                    valorTruco = 14; // Matador: Ancho de Espada
                    idUnico = '1-espada';
                } else if (numero === 1 && palo === 'basto') {
                    valorTruco = 13;
                    idUnico = '1-basto';
                } else if (numero === 7 && palo === 'espada') {
                    valorTruco = 12;
                    idUnico = '7-espada';
                } else if (numero === 7 && palo === 'oro') {
                    valorTruco = 11;
                    idUnico = '7-oro';
                } else if (numero === 3) {
                    valorTruco = 10; // Todos los 3
                    idUnico = `3-${palo}`;
                } else if (numero === 2) {
                    valorTruco = 9; // Todos los 2
                    idUnico = `2-${palo}`;
                } else if (numero === 1 && (palo === 'oro' || palo === 'copa')) {
                    valorTruco = 8; // Anchos falsos
                    idUnico = `1-falso-${palo}`;
                } else if (numero === 12) {
                    valorTruco = 7; // Todos los 12
                    idUnico = `12-${palo}`;
                } else if (numero === 11) {
                    valorTruco = 6; // Todos los 11
                    idUnico = `11-${palo}`;
                } else if (numero === 10) {
                    valorTruco = 5; // Todos los 10
                    idUnico = `10-${palo}`;
                } else if (numero === 7 && (palo === 'basto' || palo === 'copa')) {
                    valorTruco = 4; // Sietes falsos
                    idUnico = `7-falso-${palo}`;
                } else if (numero === 6) {
                    valorTruco = 3; // Todos los 6
                    idUnico = `6-${palo}`;
                } else if (numero === 5) {
                    valorTruco = 2; // Todos los 5
                    idUnico = `5-${palo}`;
                } else if (numero === 4) {
                    valorTruco = 1; // Todos los 4 (los más bajos)
                    idUnico = `4-${palo}`;
                } else {
                    // Fallback (shouldn't happen with standard deck)
                    valorTruco = 0;
                    idUnico = `${numero}-${palo}`;
                }

                this.cartas.push(new Naipe(palo, numero, valorTruco, valorEnvido, idUnico));
            }
        }
        
        console.log(`Mazo creado con ${this.cartas.length} cartas`);
        // Verify no duplicate IDs
        const ids = this.cartas.map(c => c.idUnico);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            console.error('ERROR: Duplicate card IDs found in deck!');
            console.error('Duplicate IDs:', ids.filter((id, index) => ids.indexOf(id) !== index));
        }
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