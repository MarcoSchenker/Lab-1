import React from 'react';
import { CardAnimation } from '../animations/CardAnimations';
import GameCard from './GameCard';

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
  const jugadorActual = jugadores?.find(j => j.id === jugadorActualId);
  
  if (!jugadorActual || !jugadorActual.cartasMano) {
    return (
      <div className="player-hand p-4 bg-green-800 rounded-lg">
        <div className="hand-placeholder text-center text-white">
          <span>Esperando cartas...</span>
        </div>
      </div>
    );
  }

  const skinName = jugadorSkins[jugadorActualId!] || 'Original';

  const handleCardClick = (carta: Carta) => {
    if (esMiTurno && !carta.estaJugada) {
      console.log('[PlayerHand] Jugando carta:', carta);
      onJugarCarta(carta);
    }
  };

  return (
    <div className="player-hand p-4 bg-green-800 rounded-lg shadow-lg">
      <div className="hand-title mb-3 flex justify-between items-center">
        <span className="text-white font-bold">Tus cartas</span>
        {!esMiTurno && <span className="turn-indicator text-yellow-300 text-sm">Esperando turno...</span>}
        {esMiTurno && <span className="turn-indicator active text-green-300 text-sm animate-pulse">¡Tu turno!</span>}
      </div>
      
      <div className="cards-container flex gap-3 justify-center">
        {jugadorActual.cartasMano.map((carta, index) => (
          <CardAnimation
            key={carta.idUnico}
            type="deal"
            delay={index * 100}
            duration={600}
          >
            <GameCard
              carta={carta}
              skinName={skinName}
              isPlayable={esMiTurno && !carta.estaJugada}
              isPlayed={carta.estaJugada}
              onClick={handleCardClick}
              showValues={true}
              size="large"
              className="hover:scale-110"
            />
          </CardAnimation>
        ))}
      </div>

      {jugadorActual.cartasMano.length === 0 && (
        <div className="empty-hand text-center text-white py-4">
          <span>No tienes cartas en la mano</span>
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
