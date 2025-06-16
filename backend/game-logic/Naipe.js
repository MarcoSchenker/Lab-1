class Naipe {
    /**
     * @param {string} palo El palo de la carta (e.g., 'espada', 'basto', 'oro', 'copa').
     * @param {number|string} numero El número de la carta (1-7, 10-12).
     * @param {number} valorTruco El valor de la carta para el Truco.
     * @param {number} valorEnvido El valor de la carta para el Envido.
     * @param {string} idUnico Un identificador único para la carta (e.g., '1-espada').
     */
    constructor(palo, numero, valorTruco, valorEnvido, idUnico) {
        this.palo = palo;
        this.numero = numero;
        this.valorTruco = valorTruco;
        this.valorEnvido = valorEnvido;
        this.idUnico = idUnico; // Util para el frontend y para identificar cartas específicas
    }

    toString() {
        return `${this.numero} de ${this.palo}`;
    }

    toJSON() {
        return {
            palo: this.palo,
            numero: this.numero,
            valorTruco: this.valorTruco,
            valorEnvido: this.valorEnvido,
            idUnico: this.idUnico
        };
    }
}

module.exports = Naipe;