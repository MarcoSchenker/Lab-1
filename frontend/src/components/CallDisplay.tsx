import React from 'react';
import { Jugador } from '../game/iaPro/jugador'; // Ajusta la ruta si es necesario

interface CallDisplayProps {
  call: { jugador: Jugador | null; mensaje: string } | null;
  className?: string; // Para estilos adicionales si es necesario
}

const CallDisplay: React.FC<CallDisplayProps> = ({ call, className }) => {
  // Si no hay canto, no renderizar nada
  if (!call) {
    return null;
  }

  // Determinar el nombre del jugador o "Sistema"
  const playerName = call.jugador ? call.jugador.nombre : 'Sistema';
  const message = call.mensaje;

  // Estilos con Tailwind (ajusta según tu diseño)
  const baseStyle =
    'absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 '; // Posicionamiento central (ajusta top-1/3 etc)
  const textStyle =
    'inline-block px-3 py-3 bg-black bg-opacity-75 text-yellow-300 font-bold text-xl rounded-lg shadow-xl border-2 border-yellow-500 animate-pulse whitespace-nowrap break-words max-w-[90vw]'; // Estilo del texto

  return (
    <div className={`${baseStyle} ${className}`}>
      <div className={textStyle}>
        {`${playerName}: ${message}`}
      </div>
    </div>
  );
};

export default CallDisplay;