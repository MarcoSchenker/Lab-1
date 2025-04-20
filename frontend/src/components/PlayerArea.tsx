// src/components/PlayerArea.tsx
import React from 'react';
import { Jugador } from '../game/iaPro/jugador';
import { Naipe } from '../game/iaPro/naipe';
import Card from './Card';

interface PlayerAreaProps {
    jugador: Jugador | null;
    cartas: Naipe[];
    esTurno: boolean;
    ultimoCanto: string | null;
    onCardClick: (naipe: Naipe) => void;
    puedeJugarCarta: boolean;
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
        return (
            <div className="h-48 border border-dashed border-gray-500 rounded flex items-center justify-center text-gray-400">
                Esperando jugador...
            </div>
        );
    }

    const esHumano = jugador.esHumano;
    const animationClass = esHumano ? 'animate-carta-desliza-abajo' : 'animate-carta-desliza-arriba';

    const turnoIndicatorClasses = esTurno
        ? 'ring-2 ring-offset-2 ring-offset-green-800 ring-yellow-400'
        : '';
    const areaClasses = `relative p-4 rounded-lg shadow-xl min-h-[12rem] md:min-h-[14rem] flex flex-col items-center ${turnoIndicatorClasses} ${
        esHumano ? 'bg-blue-900' : 'bg-red-900'
    }`;

    return (
        <div className={areaClasses}>
            <h2 className={`text-lg font-semibold mb-2 ${esTurno ? 'text-yellow-300' : 'text-white'}`}>
                {jugador.nombre} {esTurno ? '(Tu Turno)' : ''}
            </h2>

            <div className="flex justify-center items-end space-x-[-20px] sm:space-x-[-25px] md:space-x-[-30px] h-32">
                {cartas.map((carta, index) => (
                    <Card
                        key={carta ? `${carta.palo}-${carta.numero}` : `dorso-${index}`}
                        carta={carta}
                        bocaAbajo={!esHumano}
                        onClick={() => esHumano && puedeJugarCarta && esTurno && carta && onCardClick(carta)
                        }
                        disabled={!esHumano || !puedeJugarCarta || !esTurno || !carta}
                        imageBasePath={imageBasePath}
                        className={`z-${index * 10} ${animationClass}`}
                    />
                ))}
                {cartas.length === 0 &&
                    Array.from({ length: 3 }).map((_, index) => (
                        <Card
                            key={`placeholder-${index}`}
                            carta={null}
                            bocaAbajo={!esHumano}
                            className={`z-${index * 10} opacity-30`}
                            disabled={true}
                        />
                    ))}
            </div>

            {ultimoCanto && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-white text-black rounded-full shadow-lg text-sm font-medium whitespace-nowrap">
                    {ultimoCanto}
                </div>
            )}
        </div>
    );
};

export default PlayerArea;
