import React from 'react';
import PlayerAvatar from './PlayerAvatar';

interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

interface Jugador {
  id: number;
  nombreUsuario: string;
  equipoId: number;
  esPie: boolean;
  cartasMano: Carta[] | null;
  cartasJugadasRonda: Carta[];
  estadoConexion: string;
  skinPreferida?: string;
}

interface CartaEnMesa {
  jugadorId: number;
  carta: Carta;
}

interface GameBoardProps {
  jugadores: Jugador[];
  jugadorActualId: number | null;
  jugadorEnTurnoId?: number | null;
  cartasEnMesa?: CartaEnMesa[];
  jugadorSkins?: Record<number, string>;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  jugadores, 
  jugadorActualId,
  jugadorEnTurnoId, 
  cartasEnMesa = [],
  jugadorSkins = {}
}) => {
  const numJugadores = jugadores.length;

  const obtenerRutaSkin = (jugadorId: number): string => {
    const nombreSkin = jugadorSkins[jugadorId] || 'Original';
    return `/cartas/mazo${nombreSkin}`;
  };

  const obtenerNombreJugador = (jugadorId: number): string => {
    const jugador = jugadores.find(j => j.id === jugadorId);
    return jugador ? jugador.nombreUsuario : 'Desconocido';
  };

  const renderCartasEnMesa = () => {
    if (cartasEnMesa.length === 0) return null;

    return (
      <div className="played-cards-area">
        {cartasEnMesa.map((cartaJugada, index) => {
          const rutaSkin = obtenerRutaSkin(cartaJugada.jugadorId);
          return (
            <div key={`${cartaJugada.jugadorId}-${index}`} className="played-card">
              <img 
                src={`${rutaSkin}/${cartaJugada.carta.palo}_${cartaJugada.carta.numero}.png`}
                alt={`${cartaJugada.carta.numero} de ${cartaJugada.carta.palo}`}
                onError={(e) => {
                  // Fallback a skin original si no se encuentra la imagen
                  (e.target as HTMLImageElement).src = `/cartas/mazoOriginal/${cartaJugada.carta.palo}_${cartaJugada.carta.numero}.png`;
                }}
              />
              <span className="played-card-player">
                {obtenerNombreJugador(cartaJugada.jugadorId)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="game-board-container">
      {/* Contenedor para los avatares de los jugadores */}
      <div className={`player-avatars-container player-count-${numJugadores}`}>
        {jugadores.map((jugador, index) => (
          <div key={jugador.id} className={`player-slot player-slot-${index}`}>
            <PlayerAvatar 
              jugador={jugador}
              esTurno={jugador.id === jugadorEnTurnoId}
              esJugadorActual={jugador.id === jugadorActualId}
            />
          </div>
        ))}
      </div>

      {/* Cartas jugadas en el centro */}
      {renderCartasEnMesa()}
    </div>
  );
};

export default GameBoard;
