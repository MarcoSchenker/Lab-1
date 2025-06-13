import React from 'react';
import { CardAnimation } from '../animations/CardAnimations';

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

interface PlayerHandProps {
  jugadorActualId: number | null;
  jugadores: Jugador[];
  jugadorSkins: Record<number, string>;
  esMiTurno: boolean;
  onJugarCarta: (carta: Carta) => void;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ 
  jugadorActualId, 
  jugadores, 
  jugadorSkins,
  esMiTurno,
  onJugarCarta 
}) => {
  const jugadorActual = jugadores.find(j => j.id === jugadorActualId);
  
  if (!jugadorActual || !jugadorActual.cartasMano) {
    return (
      <div className="player-hand">
        <div className="hand-placeholder">
          <span>Esperando cartas...</span>
        </div>
      </div>
    );
  }

  const obtenerRutaSkin = (jugadorId: number): string => {
    const nombreSkin = jugadorSkins[jugadorId] || 'Original';
    return `/cartas/mazo${nombreSkin}`;
  };

  const handleCardClick = (carta: Carta) => {
    if (esMiTurno && !carta.estaJugada) {
      onJugarCarta(carta);
    }
  };

  const rutaSkin = obtenerRutaSkin(jugadorActualId!);

  return (
    <div className="player-hand">
      <div className="hand-title">
        <span>Tus cartas</span>
        {!esMiTurno && <span className="turn-indicator">Esperando turno...</span>}
        {esMiTurno && <span className="turn-indicator active">¡Tu turno!</span>}
      </div>
      
      <div className="cards-container">
        {jugadorActual.cartasMano.map((carta, index) => (
          <CardAnimation
            key={carta.idUnico}
            type="deal"
            delay={index * 100}
            duration={600}
          >
            <div 
              className={`card-wrapper ${carta.estaJugada ? 'played' : ''} ${esMiTurno && !carta.estaJugada ? 'playable' : ''}`}
              onClick={() => handleCardClick(carta)}
            >
              <div className="card-container">
                <img 
                  src={`${rutaSkin}/${carta.palo}_${carta.numero}.png`}
                  alt={`${carta.numero} de ${carta.palo}`}
                  className="card-image"
                  onError={(e) => {
                    // Fallback a skin original si no se encuentra la imagen
                    (e.target as HTMLImageElement).src = `/cartas/mazoOriginal/${carta.palo}_${carta.numero}.png`;
                  }}
                />
                {carta.estaJugada && (
                  <div className="card-played-overlay">
                    <span>Jugada</span>
                  </div>
                )}
              </div>
              
              <div className="card-info">
                <div className="card-values">
                  <span className="envido-value">E: {carta.valorEnvido}</span>
                  <span className="truco-value">T: {carta.valorTruco}</span>
                </div>
              </div>
            </div>
          </CardAnimation>
        ))}
      </div>

      {jugadorActual.cartasMano.length === 0 && (
        <div className="empty-hand">
          <span>No tienes cartas en la mano</span>
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
