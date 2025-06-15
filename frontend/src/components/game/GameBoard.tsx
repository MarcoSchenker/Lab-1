import React from 'react';
import PlayerAvatar from './PlayerAvatar';
import GameCard from './GameCard';
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

  const obtenerNombreJugador = (jugadorId: number): string => {
    const jugador = jugadores.find(j => j.id === jugadorId);
    return jugador ? jugador.nombreUsuario : 'Desconocido';
  };

  const renderCartasEnMesa = () => {
    if (cartasEnMesa.length === 0) {
      return (
        <div className="mesa-vacia flex items-center justify-center h-80 w-full bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl border-4 border-green-900 shadow-inner relative">
          {/* Efectos visuales de la mesa */}
          <div className="absolute inset-4 border-2 border-green-500 border-opacity-30 rounded-xl"></div>
          <div className="absolute inset-8 border border-green-400 border-opacity-20 rounded-lg"></div>
          
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-20">🂠</div>
            <p className="text-white text-xl font-semibold opacity-70">Mesa vacía</p>
            <p className="text-green-200 text-sm opacity-60 mt-2">Esperando cartas...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mesa-con-cartas bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl border-4 border-green-900 shadow-inner p-8 min-h-80 w-full relative">
        {/* Efectos visuales de fondo */}
        <div className="absolute inset-4 border-2 border-green-500 border-opacity-30 rounded-xl"></div>
        <div className="absolute inset-8 border border-green-400 border-opacity-20 rounded-lg"></div>
        
        {/* Grid responsivo para las cartas */}
        <div className={`cartas-jugadas grid gap-8 place-items-center h-full ${
          cartasEnMesa.length <= 2 ? 'grid-cols-2' : 
          cartasEnMesa.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 
          'grid-cols-3 md:grid-cols-5'
        }`}>
          {cartasEnMesa.map((cartaJugada, index) => {
            const skinName = jugadorSkins[cartaJugada.jugadorId] || 'Original';
            const isWinningCard = ganadorRonda === cartaJugada.jugadorId;
            const nombreJugador = obtenerNombreJugador(cartaJugada.jugadorId);
            
            return (
              <CardAnimation
                key={`${cartaJugada.jugadorId}-${cartaJugada.carta.idUnico}-${index}`}
                type="play"
                duration={600}
                delay={index * 150}
              >
                <div className={`carta-en-mesa flex flex-col items-center space-y-3 ${isWinningCard ? 'winning-card' : ''}`}>
                  <GameCard
                    carta={cartaJugada.carta}
                    skinName={skinName}
                    size="large"
                    className={`
                      ${isWinningCard ? 'ring-4 ring-yellow-400 ring-opacity-90 shadow-2xl' : 'shadow-xl'} 
                      transform transition-all duration-300
                      ${isWinningCard ? 'scale-110 rotate-1' : 'hover:scale-105'} 
                      border-2 border-white border-opacity-20
                    `}
                  />
                  <div className={`jugador-info text-center p-2 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm ${isWinningCard ? 'text-yellow-300 ring-2 ring-yellow-400' : 'text-white'}`}>
                    <p className="font-bold text-sm">{nombreJugador}</p>
                    {isWinningCard && (
                      <p className="text-xs text-yellow-300 animate-pulse font-semibold">🏆 ¡Ganadora!</p>
                    )}
                  </div>
                </div>
              </CardAnimation>
            );
          })}
        </div>
        
        {/* Información adicional en la mesa */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-xs">
          {cartasEnMesa.length} carta{cartasEnMesa.length !== 1 ? 's' : ''} en mesa
        </div>
      </div>
    );
  };

  const renderJugadores = () => {
    return (
      <div className="jugadores-alrededor absolute inset-0 pointer-events-none">
        {jugadores.map((jugador, index) => {
          const isCurrentPlayer = jugador.id === jugadorActualId;
          const isOnTurn = jugador.id === jugadorEnTurnoId;
          
          // Posicionar jugadores alrededor de la mesa
          let positionClasses = '';
          if (numJugadores === 2) {
            positionClasses = index === 0 ? 'top-4 left-1/2 transform -translate-x-1/2' : 'bottom-4 left-1/2 transform -translate-x-1/2';
          } else if (numJugadores === 4) {
            const positions = [
              'top-4 left-1/2 transform -translate-x-1/2',    // Arriba
              'right-4 top-1/2 transform -translate-y-1/2',   // Derecha
              'bottom-4 left-1/2 transform -translate-x-1/2', // Abajo
              'left-4 top-1/2 transform -translate-y-1/2'     // Izquierda
            ];
            positionClasses = positions[index];
          }

          return (
            <div
              key={jugador.id}
              className={`jugador-position absolute ${positionClasses} pointer-events-auto`}
            >
              <div className="flex flex-col items-center space-y-2">
                <PlayerAvatar
                  jugador={jugador}
                  className={`${isOnTurn ? 'ring-4 ring-blue-400 animate-pulse' : ''} ${isCurrentPlayer ? 'ring-2 ring-green-400' : ''}`}
                />
                
                {isOnTurn && (
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                    Su turno
                  </div>
                )}
                
                {/* Indicador de cartas restantes */}
                <div className="cartas-restantes bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {jugador.cartasMano ? jugador.cartasMano.filter(c => !c.estaJugada).length : 0} cartas
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="game-board relative w-full h-96 md:h-[500px] lg:h-[600px] xl:h-[700px] bg-gradient-to-br from-green-700 to-green-900 rounded-2xl shadow-2xl p-6">
      {/* Mesa central - más grande */}
      <div className="mesa-central absolute inset-6 flex items-center justify-center">
        {renderCartasEnMesa()}
      </div>

      {/* Jugadores alrededor */}
      {renderJugadores()}

      {/* Información de la mano */}
      <div className="info-mano absolute top-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        Mano {manoActual + 1}
      </div>

      {/* Indicador de ganador de ronda si existe */}
      {ganadorRonda && (
        <div className="ganador-ronda absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-bold animate-pulse">
          {obtenerNombreJugador(ganadorRonda)} ganó la mano
        </div>
      )}
    </div>
  );
};

export default GameBoard;
