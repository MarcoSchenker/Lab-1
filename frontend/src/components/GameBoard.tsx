// src/components/GameBoard.tsx
import Card from './Card';

const GameBoard = ({ cartasMesa, numeroManoActual, className = "", imageBasePath = '/cartas/mazoOriginal' }) => {
  return (
    <div className={`flex justify-center items-center rounded p-10 min-h-[10rem] md:min-h-[12rem] gap-x-16 ${className}`}>
      {cartasMesa.map((mano, manoIndex) => {
        if (!Array.isArray(mano)) return null;
        const cartaHumano = mano[0] || null;
        const cartaIA = mano[1] || null;
        // const esManoActiva = manoIndex === numeroManoActual; // This variable is no longer needed for styling

        return (
          <div
            key={`mano-${manoIndex}`}
            // Removed the conditional classes for the highlight
            className={`flex flex-col items-center space-y-14 p-3 rounded`}
            aria-label={`Mano ${manoIndex + 1}`}
          >
            {/* IA */}
            <div className="h-40 md:h-36 flex items-center justify-center">
              {cartaIA ? (
                <Card
                  carta={cartaIA}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className="animate-carta-desliza-arriba"
                />
              ) : (
                <div className="w-36 h-auto md:w-24 md:h-[12rem] rounded bg-black bg-opacity-10"></div>
              )}
            </div>
            {/* Humano */}
            <div className="h-40 md:h-36 flex items-center justify-center">
              {cartaHumano ? (
                <Card
                  carta={cartaHumano}
                  bocaAbajo={false}
                  disabled={true}
                  imageBasePath={imageBasePath}
                  className="animate-carta-desliza-abajo"
                />
              ) : (
                <div className="w-36 h-auto md:w-24 md:h-[12rem] rounded bg-black bg-opacity-10"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;