// src/components/PlayerArea.tsx
import React from 'react';
import { Jugador } from '../game/iaPro/jugador'; // Ajusta la ruta
import { Naipe } from '../game/iaPro/naipe'; // Ajusta la ruta
import Card from './Card'; // Importar el componente Card

interface PlayerAreaProps {
    jugador: Jugador | null;
    cartas: Naipe[]; // Cartas en mano de este jugador
    esTurno: boolean;
    ultimoCanto: string | null; // El mensaje del último canto de este jugador
    onCardClick: (index: number) => void; // Callback al hacer clic en una carta
    puedeJugarCarta: boolean; // Si las cartas son clickeables ahora
    imageBasePath?: string;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
    jugador,
    cartas,
    esTurno,
    ultimoCanto,
    onCardClick,
    puedeJugarCarta,
    imageBasePath = './cartas/mazoOriginal',
}) => {
    if (!jugador) {
        // Podríamos mostrar un placeholder o nada si el jugador aún no está definido
        return <div className="h-48 border border-dashed border-gray-500 rounded flex items-center justify-center text-gray-400">Esperando jugador...</div>;
    }

    const esHumano = jugador.esHumano;

    // Estilos condicionales para indicar el turno
    const turnoIndicatorClasses = esTurno ? 'ring-2 ring-offset-2 ring-offset-green-800 ring-yellow-400' : '';
    const areaClasses = `relative p-4 rounded-lg shadow-xl min-h-[12rem] md:min-h-[14rem] flex flex-col items-center ${turnoIndicatorClasses} ${esHumano ? 'bg-blue-900' : 'bg-red-900'}`; // Colores distintos para humano/IA

    return (
        <div className={areaClasses}>
            {/* Nombre del Jugador */}
            <h2 className={`text-lg font-semibold mb-2 ${esTurno ? 'text-yellow-300' : 'text-white'}`}>
                {jugador.nombre} {esTurno ? '(Tu Turno)' : ''}
            </h2>

            {/* Cartas en Mano */}
            <div className="flex justify-center items-end space-x-[-20px] sm:space-x-[-25px] md:space-x-[-30px] h-32"> {/* Solapamiento negativo */}
                {cartas.map((carta, index) => (
                    <Card
                        key={carta ? `${carta.palo}-${carta.numero}` : `dorso-${index}`} // Key única
                        carta={carta}
                        bocaAbajo={!esHumano} // IA siempre boca abajo
                        onClick={() => esHumano && onCardClick(index)} // Solo clickeable si es humano
                        disabled={!esHumano || !puedeJugarCarta || !esTurno} // Deshabilitada si no es humano, no puede jugar, o no es su turno
                        imageBasePath={imageBasePath}
                        className={`z-${index * 10}`} // Añadir z-index para solapamiento correcto
                    />
                ))}
                {/* Mostrar placeholders si no hay cartas (ej, al inicio) */}
                 {cartas.length === 0 && Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`placeholder-${index}`} carta={null} bocaAbajo={!esHumano} className={`z-${index*10} opacity-30`} />
                 ))}
            </div>

            {/* Globo de Canto (opcional) */}
            {ultimoCanto && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-white text-black rounded-full shadow-lg text-sm font-medium whitespace-nowrap">
                    {ultimoCanto}
                </div>
            )}
        </div>
    );
};

export default PlayerArea;