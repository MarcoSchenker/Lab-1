import React, { JSX } from 'react';
import { Equipo } from '../game/iaPro/types';

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
    const fosforos: JSX.Element[] = [];

    // Grupos de 5 (cuatro verticales, uno cruzado)
    for (let i = 0; i < gruposDeCinco; i++) {
      fosforos.push(
        <div key={`grupo-${i}`} className="inline-block mr-3 relative">
          <div className="flex">
            <div className="w-1 h-4 bg-yellow-500 mx-px"></div>
            <div className="w-1 h-4 bg-yellow-500 mx-px"></div>
            <div className="w-1 h-4 bg-yellow-500 mx-px"></div>
            <div className="w-1 h-4 bg-yellow-500 mx-px"></div>
          </div>
          {/* Fósforo diagonal cruzado */}
          <div className="absolute top-0 left-1 w-full">
            <div className="w-full h-1 bg-yellow-300 transform rotate-45 origin-left"></div>
          </div>
        </div>
      );
    }

    // Resto de palitos individuales
    if (resto > 0) {
      fosforos.push(
        <div key="resto" className="inline-block">
          <div className="flex">
            {Array.from({ length: resto }).map((_, j) => (
              <div key={`resto-${j}`} className="w-1 h-4 bg-yellow-400 mx-px"></div>
            ))}
          </div>
        </div>
      );
    }

    return fosforos.length > 0 ? fosforos : <span className="text-gray-500">-</span>;
  };

  return (
    <div className={`w-full max-w-md p-4 bg-green-800 rounded-lg shadow-lg text-white ${className}`}>
      <h2 className="text-xl font-bold text-center mb-3 border-b border-green-600 pb-2">
        Marcador ({limitePuntaje} puntos)
      </h2>
      
      <div className="flex justify-between items-center text-lg">
        {/* Jugador 1 */}
        <div className="flex-1">
          <div className="bg-green-900 rounded-t-md p-2">
            <span className="font-semibold block truncate text-yellow-100" title={nombreJ1}>
              {nombreJ1}
            </span>
          </div>
          <div className="bg-green-700 p-2 rounded-b-md min-h-12 flex items-center">
            <div className="text-yellow-400 font-bold mr-2">{puntosJ1}</div>
            <div className="flex-1" aria-label={`${puntosJ1} puntos`}>
              {renderFosforos(puntosJ1)}
            </div>
          </div>
        </div>

        {/* Separador central */}
        <div className="mx-4 text-2xl font-bold text-yellow-200">
          VS
        </div>

        {/* Jugador 2 */}
        <div className="flex-1">
          <div className="bg-green-900 rounded-t-md p-2 text-right">
            <span className="font-semibold block truncate text-yellow-100" title={nombreJ2}>
              {nombreJ2}
            </span>
          </div>
          <div className="bg-green-700 p-2 rounded-b-md min-h-12 flex items-center justify-end">
            <div className="flex-1 text-right" aria-label={`${puntosJ2} puntos`}>
              {renderFosforos(puntosJ2)}
            </div>
            <div className="text-yellow-400 font-bold ml-2">{puntosJ2}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;