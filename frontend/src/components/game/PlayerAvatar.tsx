import React from 'react';
import './PlayerAvatar.css';

interface Jugador {
  id: number;
  nombreUsuario: string;
  equipoId: number;
  esPie: boolean;
  estadoConexion: string;
  skinPreferida?: string;
}

interface PlayerAvatarProps {
  jugador: Jugador;
  esTurno?: boolean;
  esJugadorActual?: boolean;
  className?: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  jugador, 
  esTurno = false, 
  esJugadorActual = false, 
  className = '' 
}) => {
  const getAvatarClass = () => {
    let classes = 'player-avatar';
    if (esTurno) classes += ' turn-active';
    if (esJugadorActual) classes += ' current-player';
    if (className) classes += ` ${className}`;
    return classes;
  };

  const getConnectionStatusText = () => {
    return jugador.estadoConexion === 'conectado' ? 'Conectado' : 'Desconectado';
  };

  const getPlayerInitials = () => {
    return jugador.nombreUsuario.substring(0, 2).toUpperCase();
  };

  return (
    <div className={getAvatarClass()}>
      <div className={`avatar-image team-${jugador.equipoId}`}>
        {getPlayerInitials()}
      </div>
      <span className="player-name" title={jugador.nombreUsuario}>
        {jugador.nombreUsuario}
      </span>
      {jugador.esPie && (
        <span className="player-role">PIE</span>
      )}
      <span className={`player-connection-status ${jugador.estadoConexion}`}>
        {getConnectionStatusText()}
      </span>
    </div>
  );
};

export default PlayerAvatar;
