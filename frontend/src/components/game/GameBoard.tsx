import React from 'react';
import PlayerAvatar from './PlayerAvatar';
import { CardAnimation, TurnIndicator } from '../animations/CardAnimations';

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
  ganadorRonda?: number | null;
  manoActual?: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  jugadores, 
  jugadorActualId,
  jugadorEnTurnoId, 
  cartasEnMesa = [],
  jugadorSkins = {},
  ganadorRonda = null,
  manoActual = 0
}) => {
  const numJugadores = jugadores.length;
  
  // Log mano actual para debug si es necesario
  console.log(`GameBoard - Mano actual: ${manoActual + 1}`);

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
          const isWinningCard = ganadorRonda === cartaJugada.jugadorId;
          
          return (
            <CardAnimation
              key={`${cartaJugada.jugadorId}-${index}`}
              type="play"
              duration={500}
              delay={index * 200}
            >
              <div className={`played-card ${isWinningCard ? 'winning-card' : ''}`}>
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
            </CardAnimation>
          );
        })}
      </div>
    );
  };

  return (
    <div className="game-board-container">
      {/* Indicador de turno */}
      {jugadorEnTurnoId && (
        <TurnIndicator 
          currentPlayer={obtenerNombreJugador(jugadorEnTurnoId)}
          isMyTurn={jugadorEnTurnoId === jugadorActualId}
        />
      )}
      
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
