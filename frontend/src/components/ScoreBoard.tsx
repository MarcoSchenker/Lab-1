// src/components/Scoreboard.tsx
import React, { JSX } from 'react';
import { Equipo } from '../game/iaPro/types'; // Ajusta la ruta

interface ScoreboardProps {
    equipoPrimero: Equipo | null;
    equipoSegundo: Equipo | null;
    limitePuntaje: number;
    className?: string;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
    equipoPrimero,
    equipoSegundo,
    limitePuntaje,
    className = ''
}) => {
    const nombreJ1 = equipoPrimero?.jugador?.nombre ?? 'Jugador 1';
    const puntosJ1 = equipoPrimero?.puntos ?? 0;
    const nombreJ2 = equipoSegundo?.jugador?.nombre ?? 'Jugador 2';
    const puntosJ2 = equipoSegundo?.puntos ?? 0;

    // Función para generar los "fósforos" (marcas de puntaje)
    const renderFosforos = (puntos: number) => {
        const gruposDeCinco = Math.floor(puntos / 5);
        const resto = puntos % 5;
        // --- CORRECCIÓN AQUÍ: Especificar el tipo del array ---
        const fosforos: JSX.Element[] = []; // O React.ReactNode[]

        // Grupos de 5 (cuatro verticales, uno cruzado)
        for (let i = 0; i < gruposDeCinco; i++) {
            // El push ahora es válido porque el array es de JSX.Element[]
            fosforos.push(
                <span key={`grupo-${i}`} className="inline-block mr-2">
                    {/* Estos spans representan los fósforos */}
                    <span className="inline-block rotate-[-20deg] border-l border-current h-3 mr-[-2px]"></span>
                    <span className="inline-block rotate-[-20deg] border-l border-current h-3 mr-[-2px]"></span>
                    <span className="inline-block rotate-[-20deg] border-l border-current h-3 mr-[-2px]"></span>
                    <span className="inline-block rotate-[-20deg] border-l border-current h-3 mr-[-4px]"></span>
                    {/* Este span es el fósforo cruzado */}
                    <span className="inline-block absolute mt-[5px] ml-[-10px] border-t border-current w-3 rotate-[45deg]"></span>
                </span>
            );
        }

        // Resto
        if (resto > 0) {
             fosforos.push(
                 <span key="resto" className="inline-block mr-1">
                     {/* Renderiza 'resto' número de fósforos verticales */}
                     {Array.from({ length: resto }).map((_, j) => (
                         <span key={`resto-${j}`} className="inline-block rotate-[-20deg] border-l border-current h-3 mr-[-2px]"></span>
                     ))}
                 </span>
             );
        }

        return fosforos.length > 0 ? fosforos : <span className="text-gray-500">-</span>;
    };


    return (
        <div className={`w-full max-w-md p-3 bg-black bg-opacity-40 rounded-lg shadow-md text-white ${className}`}>
            <h2 className="text-xl font-bold text-center mb-2 border-b border-gray-600 pb-1">Marcador ({limitePuntaje} puntos)</h2>
            <div className="flex justify-between items-start text-lg space-x-4">
                {/* Jugador 1 */}
                <div className="flex-1 text-left">
                    <span className="font-semibold block truncate" title={nombreJ1}>{nombreJ1}</span>
                     <div className="text-sm h-6 text-yellow-400" aria-label={`${puntosJ1} puntos`}>
                         {renderFosforos(puntosJ1)}
                     </div>
                </div>
                {/* Separador */}
                 <div className="text-gray-500 font-bold text-2xl">
                     {puntosJ1} - {puntosJ2}
                 </div>
                {/* Jugador 2 */}
                <div className="flex-1 text-right">
                    <span className="font-semibold block truncate" title={nombreJ2}>{nombreJ2}</span>
                    <div className="text-sm h-6 text-yellow-400 flex justify-end" aria-label={`${puntosJ2} puntos`}>
                        {renderFosforos(puntosJ2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Scoreboard;