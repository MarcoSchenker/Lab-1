import Card from './Card';

const manosIndices = [
  { j1: 0, j2: 1 },
  { j1: 2, j2: 3 },
  { j1: 4, j2: 5 },
];

const GameBoard = ({ cartasMesa, numeroManoActual, className = "", imageBasePath = '/cartas/mazoOriginal' }) => {
  return (
    <div className={`flex justify-around items-center bg-green-800 rounded p-4 border border-yellow-600 border-opacity-30 min-h-[10rem] md:min-h-[12rem] ${className}`}>
      {manosIndices.map((indices, manoIndex) => {
        const cartaJ1 = cartasMesa[indices.j1];
        const cartaJ2 = cartasMesa[indices.j2];
        const esManoActiva = manoIndex === numeroManoActual;
        
        return (
          <div
            key={`mano-${manoIndex}`}
            className={`flex flex-col items-center space-y-2 p-2 rounded ${esManoActiva ? 'bg-black bg-opacity-20 ring-1 ring-yellow-500' : ''}`}
            aria-label={`Mano ${manoIndex + 1}`}
          >
            {/* Slot para carta del Jugador 2 (IA - arriba) */}
            <div className="h-24 md:h-28 flex items-center justify-center">
              {cartaJ2 ? (
                <Card
                  carta={cartaJ2}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className={`animate-carta-desliza-arriba ${esManoActiva ? 'animate-pulse-slow' : ''}`}
                />
              ) : (
                <div className="w-16 h-24 md:w-20 md:h-[6.5rem] border-2 border-dashed border-gray-500 rounded bg-black bg-opacity-10"></div>
              )}
            </div>
            
            {/* Indicador de Mano */}
            <span className={`text-xs font-semibold ${esManoActiva ? 'text-yellow-300' : 'text-gray-400'}`}>
              Mano {manoIndex + 1}
            </span>
            
            {/* Slot para carta del Jugador 1 (Humano - abajo) */}
            <div className="h-24 md:h-28 flex items-center justify-center">
              {cartaJ1 ? (
                <Card
                  carta={cartaJ1}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className={`animate-carta-desliza-abajo ${esManoActiva ? 'animate-pulse-slow' : ''}`}
                />
              ) : (
                <div className="w-16 h-24 md:w-20 md:h-[6.5rem] border-2 border-dashed border-gray-500 rounded bg-black bg-opacity-10"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;