// src/components/PlayerArea.tsx
import React from 'react';
import { Jugador } from '../game/iaPro/jugador';
import { Naipe } from '../game/iaPro/naipe';
import Card from './Card';

interface PlayerAreaProps {
    jugador: Jugador | null;
    cartas: Naipe[];
    esTurno: boolean;
    onCardClick: (naipe: Naipe) => void;
    puedeJugarCarta: boolean;
    imageBasePath?: string;
    className?: string; // Agregado para poder pasar clases adicionales (como bg-transparent)
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
    jugador,
    cartas,
    esTurno,
    onCardClick,
    puedeJugarCarta,
    imageBasePath = './cartas/mazoOriginal',
    className = "", // Valor por defecto
}) => {
    if (!jugador) {
        return (
            <div className={`h-48 border border-dashed rounded flex items-center justify-center text-gray-400 ${className}`}>
                Esperando jugador...
            </div>
        );
    }

    const esHumano = jugador.esHumano;
    const animationClass = esHumano ? 'animate-carta-desliza-abajo' : 'animate-carta-desliza-arriba';
    const areaClasses = `relative p-4 rounded-lg min-h-[8rem] md:min-h-[10rem] flex flex-col items-center ${className}`;

    return (
        <div className={areaClasses}>
            <h2 className={`text-lg font-semibold mb-2 ${esTurno ? 'text-yellow-300' : 'text-white'}`}>
                {jugador.nombre} {esTurno ? '(Tu Turno)' : ''}
            </h2>

            <div className="flex justify-center items-end space-x-[-16px] sm:space-x-[-20px] md:space-x-[-30px] h-48 w-3/4">
                {/* Renderizar cartas reales */}
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
                {/* Renderizar placeholders si no hay cartas */}
                {cartas.length === 0 &&
                    Array.from({ length: 3 }).map((_, index) => (
                        <Card
                            key={`placeholder-${index}`}
                            carta={null} // Naipe es null para placeholder
                            bocaAbajo={!esHumano} // Mostrar dorso si no es humano
                            className={`z-${index * 10} opacity-30`}
                            disabled={true} // No interactivo
                            // No necesita imageBasePath si carta es null y bocaAbajo true (Card debería manejar esto)
                        />
                    ))}
            </div>
        </div>
    );
};

export default PlayerArea;