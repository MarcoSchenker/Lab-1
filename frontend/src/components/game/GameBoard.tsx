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

interface ManoJugada {
  numeroMano: number;
  jugadas: Array<{
    jugadorId: number;
    carta: Carta;
    equipoId?: number;
    ordenJugada?: number;
  }>;
  ganadorManoEquipoId: number | null;
  ganadorManoJugadorId: number | null;
  fueParda: boolean;
  jugadorQueInicioManoId: number | null;
}

interface GameBoardProps {
  jugadores: Jugador[];
  jugadorActualId: number | null;
  jugadorEnTurnoId?: number | null;
  cartasEnMesa?: CartaEnMesa[];
  manosJugadas?: ManoJugada[];
  jugadorSkins?: Record<number, string>;
  ganadorRonda?: number | null;
  manoActual?: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  jugadores, 
  jugadorActualId,
  jugadorEnTurnoId, 
  cartasEnMesa = [],
  manosJugadas = [],
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
    // Mostrar cartas de manera más organizada
    const todasLasCartas: Array<{
      jugadorId: number;
      carta: Carta;
      manoNumero: number;
      ganadorMano: number | null;
      fueParda: boolean;
      esCartaActual: boolean;
      equipoId?: number;
      ordenJugada?: number;
    }> = [];
    
    // Agregar cartas de manos anteriores
    manosJugadas.forEach((mano) => {
      if (!mano.numeroMano || !mano.jugadas) return;
      
      mano.jugadas.forEach((jugada) => {
        todasLasCartas.push({
          jugadorId: jugada.jugadorId,
          carta: jugada.carta,
          equipoId: jugada.equipoId || 0,
          ordenJugada: jugada.ordenJugada || 0,
          manoNumero: mano.numeroMano,
          ganadorMano: mano.ganadorManoJugadorId,
          fueParda: mano.fueParda || false,
          esCartaActual: false
        });
      });
    });
    
    // Agregar cartas de la mano actual (solo si no están ya en manosJugadas)
    const manoActualNumero = manoActual + 1;
    const existeManoActualEnHistorial = manosJugadas.some(m => m.numeroMano === manoActualNumero);
    
    if (!existeManoActualEnHistorial) {
      cartasEnMesa.forEach((cartaJugada) => {
        todasLasCartas.push({
          jugadorId: cartaJugada.jugadorId,
          carta: cartaJugada.carta,
          manoNumero: manoActualNumero,
          ganadorMano: null,
          fueParda: false,
          esCartaActual: true
        });
      });
    }

    if (todasLasCartas.length === 0) {
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

    // Agrupar cartas por mano y evitar duplicados
    const cartasPorMano = todasLasCartas.reduce((acc, carta) => {
      const key = `${carta.manoNumero}-${carta.jugadorId}-${carta.carta.idUnico}`;
      if (!acc[carta.manoNumero]) {
        acc[carta.manoNumero] = {};
      }
      if (!acc[carta.manoNumero][key]) {
        acc[carta.manoNumero][key] = carta;
      }
      return acc;
    }, {} as Record<number, Record<string, typeof todasLasCartas[0]>>);

    return (
      <div className="mesa-con-cartas bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl border-4 border-green-900 shadow-inner p-6 min-h-80 w-full relative">
        {/* Efectos visuales de fondo */}
        <div className="absolute inset-4 border-2 border-green-500 border-opacity-30 rounded-xl"></div>
        <div className="absolute inset-8 border border-green-400 border-opacity-20 rounded-lg"></div>
        
        {/* Mostrar manos organizadas */}
        <div className="manos-container space-y-6">
          {Object.entries(cartasPorMano).map(([numeroMano, cartasDeEsaMano]) => {
            const cartasArray = Object.values(cartasDeEsaMano);
            const primeraCartaDeLaMano = cartasArray[0];
            
            return (
              <div key={`mano-${numeroMano}`} className="mano-group">
                <div className="mano-header text-center mb-3">
                  <h3 className="text-white font-bold text-base">
                    Mano {numeroMano}
                    {!primeraCartaDeLaMano?.esCartaActual && (
                      <span className="ml-2 text-sm">
                        {primeraCartaDeLaMano?.fueParda ? 
                          '(Parda)' : 
                          primeraCartaDeLaMano?.ganadorMano ? 
                            `(Ganó: ${obtenerNombreJugador(primeraCartaDeLaMano.ganadorMano)})` : 
                            ''
                        }
                      </span>
                    )}
                    {primeraCartaDeLaMano?.esCartaActual && (
                      <span className="ml-2 text-sm text-yellow-300">(En juego)</span>
                    )}
                  </h3>
                </div>
                
                {/* Cartas organizadas horizontalmente */}
                <div className="cartas-mano flex justify-center items-center gap-4 flex-wrap">
                  {cartasArray.map((cartaJugada) => {
                    const nombreJugador = obtenerNombreJugador(cartaJugada.jugadorId);
                    const skinName = jugadorSkins[cartaJugada.jugadorId] || 'Original';
                    const isWinningCard = cartaJugada.ganadorMano === cartaJugada.jugadorId;
                    const isCartaAnterior = !cartaJugada.esCartaActual;
                    
                    return (
                      <div key={`carta-${cartaJugada.jugadorId}-${cartaJugada.carta.idUnico}-mano-${numeroMano}`} className="carta-con-jugador flex flex-col items-center">
                        {/* Nombre del jugador */}
                        <div className="jugador-nombre text-white font-semibold text-xs mb-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                          {nombreJugador}
                        </div>
                        
                        {/* Carta */}
                        <div className="carta-wrapper relative">
                          <CardAnimation
                            type="play"
                            duration={400}
                            delay={0}
                          >
                            <GameCard
                              carta={cartaJugada.carta}
                              skinName={skinName}
                              size="small"
                              className={`
                                ${isWinningCard ? 'ring-3 ring-yellow-400 ring-opacity-90 shadow-xl' : 'shadow-lg'} 
                                transform transition-all duration-300
                                ${isWinningCard ? 'scale-110' : 'hover:scale-105'} 
                                border border-white border-opacity-20
                                ${isCartaAnterior ? 'grayscale-[0.2] opacity-80' : ''}
                              `}
                            />
                          </CardAnimation>
                          {isWinningCard && (
                            <div className="carta-ganadora-icon absolute -top-1 -right-1 text-yellow-400 text-lg">
                              🏆
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Información adicional en la mesa */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {todasLasCartas.length} carta{todasLasCartas.length !== 1 ? 's' : ''}
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
          
          // Posicionar jugadores alrededor de la mesa (más compacto)
          let positionClasses = '';
          if (numJugadores === 2) {
            positionClasses = index === 0 ? 'top-2 left-1/2 transform -translate-x-1/2' : 'bottom-2 left-1/2 transform -translate-x-1/2';
          } else if (numJugadores === 4) {
            const positions = [
              'top-2 left-1/2 transform -translate-x-1/2',    // Arriba
              'right-2 top-1/2 transform -translate-y-1/2',   // Derecha
              'bottom-2 left-1/2 transform -translate-x-1/2', // Abajo
              'left-2 top-1/2 transform -translate-y-1/2'     // Izquierda
            ];
            positionClasses = positions[index];
          }

          return (
            <div
              key={jugador.id}
              className={`jugador-position absolute ${positionClasses} pointer-events-auto`}
            >
              <div className="flex flex-col items-center space-y-1">
                <PlayerAvatar
                  jugador={jugador}
                  className={`${isOnTurn ? 'ring-4 ring-blue-400 animate-pulse' : ''} ${isCurrentPlayer ? 'ring-2 ring-green-400' : ''}`}
                />
                
                {isOnTurn && (
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                    Su turno
                  </div>
                )}
                
                {/* Indicador de cartas restantes más compacto */}
                <div className="cartas-restantes bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {jugador.cartasMano ? jugador.cartasMano.filter(c => !c.estaJugada).length : 0}
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
