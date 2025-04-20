// src/components/GameBoard.tsx
import Card from './Card';

const GameBoard = ({ cartasMesa, numeroManoActual, className = "", imageBasePath = '/cartas/mazoOriginal' }) => {
  return (
    <div className={`flex justify-around items-center bg-green-800 rounded p-4 border border-yellow-600 border-opacity-30 min-h-[10rem] md:min-h-[12rem] ${className}`}>
      {cartasMesa.map((mano, manoIndex) => {
        if (!Array.isArray(mano)) return null;

        const cartaHumano = mano[0] || null;
        const cartaIA = mano[1] || null;
        const esManoActiva = manoIndex === numeroManoActual;

        return (
          <div
            key={`mano-${manoIndex}`}
            className={`flex flex-col items-center space-y-2 p-2 rounded ${esManoActiva ? 'bg-black bg-opacity-20 ring-1 ring-yellow-500' : ''}`}
            aria-label={`Mano ${manoIndex + 1}`}
          >
            {/* IA */}
            <div className="h-24 md:h-28 flex items-center justify-center">
              {cartaIA ? (
                <Card
                  carta={cartaIA}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className="animate-carta-desliza-arriba"
                />
              ) : (
                <div className="w-16 h-24 md:w-20 md:h-[6.5rem] border-2 border-dashed border-gray-500 rounded bg-black bg-opacity-10"></div>
              )}
            </div>

            <span className={`text-xs font-semibold ${esManoActiva ? 'text-yellow-300' : 'text-gray-400'}`}>
              Mano {manoIndex + 1}
            </span>

            {/* Humano */}
            <div className="h-24 md:h-28 flex items-center justify-center">
              {cartaHumano ? (
                <Card
                  carta={cartaHumano}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className="animate-carta-desliza-abajo"
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
