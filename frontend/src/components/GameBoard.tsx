// src/components/GameBoard.tsx
import React from 'react';
import { Naipe } from '../game/iaPro/naipe'; // Ajusta la ruta
import { Equipo } from '../game/iaPro/types'; // Ajusta la ruta
import Card from './Card'; // Importar el componente Card

interface GameBoardProps {
    cartasMesa: (Naipe | null)[]; // Array de 6 cartas [J1M0, J2M0, J1M1, J2M1, J1M2, J2M2]
    equipoPrimero: Equipo | null; // Para saber quién es quién (opcional, podríamos deducirlo)
    equipoSegundo: Equipo | null;
    numeroManoActual: number; // Para saber qué mano resaltar (0, 1, 2)
    imageBasePath?: string;
    className?: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
    cartasMesa,
    equipoPrimero, // Podríamos no necesitarlo si siempre J1 es Humano, J2 IA
    equipoSegundo,
    numeroManoActual,
    imageBasePath = '/cartas/mazoOriginal', // Misma ruta que en Card
    className = '',
}) => {
    // Definir los pares de índices para cada mano en el array cartasMesa
    const manosIndices = [
        { j1: 0, j2: 1 }, // Mano 0 (índices 0 y 1)
        { j1: 2, j2: 3 }, // Mano 1 (índices 2 y 3)
        { j1: 4, j2: 5 }, // Mano 2 (índices 4 y 5)
    ];

    return (
        <div className={`flex justify-around items-center bg-green-800 rounded p-4 border border-yellow-600 border-opacity-30 min-h-[10rem] md:min-h-[12rem] ${className}`}>
            {manosIndices.map((indices, manoIndex) => {
                const cartaJ1 = cartasMesa[indices.j1];
                const cartaJ2 = cartasMesa[indices.j2];
                const esManoActiva = manoIndex === numeroManoActual;

                return (
                    <div
                        key={`mano-${manoIndex}`}
                        className={`flex flex-col items-center space-y-2 p-2 rounded ${esManoActiva ? 'bg-black bg-opacity-20 ring-1 ring-yellow-500' : ''}`}
                        aria-label={`Mano ${manoIndex + 1}`}
                    >
                        {/* Slot para carta del Jugador 2 (IA - arriba) */}
                        <div className="h-24 md:h-28 flex items-center justify-center">
                            {cartaJ2 ? (
                                <Card
                                    carta={cartaJ2}
                                    bocaAbajo={false} // Las cartas en mesa siempre boca arriba
                                    disabled={true} // No son clickeables
                                    imageBasePath={imageBasePath}
                                    className={esManoActiva ? 'animate-pulse-slow' : ''} // Efecto sutil si es mano activa
                                />
                            ) : (
                                // Placeholder si no se ha jugado la carta
                                <div className="w-16 h-24 md:w-20 md:h-[6.5rem] border-2 border-dashed border-gray-500 rounded bg-black bg-opacity-10"></div>
                            )}
                        </div>

                         {/* Indicador de Mano (opcional) */}
                         <span className={`text-xs font-semibold ${esManoActiva ? 'text-yellow-300' : 'text-gray-400'}`}>
                             Mano {manoIndex + 1}
                         </span>

                        {/* Slot para carta del Jugador 1 (Humano - abajo) */}
                         <div className="h-24 md:h-28 flex items-center justify-center">
                            {cartaJ1 ? (
                                <Card
                                    carta={cartaJ1}
                                    bocaAbajo={false}
                                    disabled={true}
                                    imageBasePath={imageBasePath}
                                    className={esManoActiva ? 'animate-pulse-slow' : ''}
                                />
                            ) : (
                                <div className="w-16 h-24 md:w-20 md:h-[6.5rem] border-2 border-dashed border-gray-500 rounded bg-black bg-opacity-10"></div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


module.exports = {
theme: {
extend: {
animation: {
'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
}
}
}

export default GameBoard;