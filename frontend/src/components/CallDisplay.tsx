import React from 'react';
import { Jugador } from '../game/iaPro/jugador'; // Ajusta la ruta si es necesario

interface CallHistoryItem {
  id?: string | number;
  jugador: Jugador | null;
  mensaje: string;
  timestamp?: number;
}

interface CallDisplayProps {
  call: { jugador: Jugador | null; mensaje: string } | null;
  history?: CallHistoryItem[];
  className?: string; // Para estilos adicionales si es necesario
}

const CallDisplay: React.FC<CallDisplayProps> = ({ call, history = [], className }) => {
  const recentHistory = history.slice(0, 5);

  if (!call && recentHistory.length === 0) {
    return null;
  }

  const renderCallOverlay = () => {
    if (!call) return null;

    const playerName = call.jugador ? call.jugador.nombre : 'Sistema';
    const message = call.mensaje;
    const baseStyle =
      'absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none';
    const textStyle =
      'inline-block px-3 py-3 bg-black bg-opacity-75 text-yellow-300 font-bold text-xl rounded-lg shadow-xl border-2 border-yellow-500 animate-pulse whitespace-nowrap break-words max-w-[90vw]';

    return (
      <div className={`${baseStyle} ${className ?? ''}`}>
        <div className={textStyle}>
          {`${playerName}: ${message}`}
        </div>
      </div>
    );
  };

  const renderHistoryPanel = () => {
    if (recentHistory.length === 0) return null;

    return (
      <div className="absolute top-4 right-4 z-30 w-64 bg-stone-900/80 border border-yellow-500/70 rounded-lg shadow-xl backdrop-blur px-4 py-3 space-y-2">
        <div className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Mensajes Recientes</div>
        <div className="space-y-2 max-h-64 overflow-hidden">
          {recentHistory.map((entry, idx) => {
            const key = entry.id ?? entry.timestamp ?? `${entry.jugador?.nombre ?? 'sistema'}-${idx}-${entry.mensaje}`;
            return (
              <div key={key} className="bg-black/40 rounded-md px-3 py-2">
                <div className="text-xs text-yellow-300 font-semibold">{entry.jugador ? entry.jugador.nombre : 'Sistema'}</div>
                <div className="text-sm text-white leading-snug">{entry.mensaje}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCallOverlay()}
      {renderHistoryPanel()}
    </>
  );
};

export default CallDisplay;