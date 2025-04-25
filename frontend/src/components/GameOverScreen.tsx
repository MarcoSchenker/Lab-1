// src/components/EndGameScreen.tsx
import React from 'react';

// Definimos las props
interface EndGameScreenProps {
  // Indica si el jugador humano ganó la partida
  humanPlayerWon: boolean;
  // Función callback para iniciar una revancha con los puntos indicados
  onRematch: (puntosLimite: 15 | 30) => void;
  onExit?: () => void;
}

const EndGameScreen: React.FC<EndGameScreenProps> = ({ humanPlayerWon, onRematch, onExit }) => {
    const doradoClaro = 'yellow-500';
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-stone-800 bg-opacity-95 p-8 md:p-12 rounded-lg shadow-xl border-2 border-yellow-600 w-full max-w-lg mx-auto text-center">

        {/* Título */}
        <h2 className="text-3xl md:text-4xl font-bold text-yellow-300 mb-4 tracking-wider">
          FIN DE PARTIDA
        </h2>

        {/* Separador Decorativo Combinado (Línea con Símbolo) */}
        <div className="flex items-center my-4 w-2/3 mx-auto">
            <div className={`flex-grow h-px bg-gradient-to-r from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
            <div className={`text-3xl text-${doradoClaro} mx-2`}>⚜️</div>
            <div className={`flex-grow h-px bg-gradient-to-l from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
        </div>


        {/* Mensaje de Resultado (usa la prop 'humanPlayerWon') */}
        <p className="text-2xl text-gray-100 mb-2">
          {humanPlayerWon ? '¡Ganaste la partida!' : 'Perdiste la partida...'}
        </p>

        {/* Mensaje Motivacional (usa la prop 'humanPlayerWon') */}
        <p className="text-xl text-gray-300 mb-8">
          {humanPlayerWon ? '¡Excelente truchero!' : '¡Mejor suerte la próxima!'}
        </p>

        {/* Separador Decorativo Combinado (Línea con Símbolo) */}
        <div className="flex items-center my-4 w-2/3 mx-auto">
            <div className={`flex-grow h-px bg-gradient-to-r from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
            <div className={`text-3xl text-${doradoClaro} mx-2`}>⚜️</div>
            <div className={`flex-grow h-px bg-gradient-to-l from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
        </div>

        {/* Botones de Revancha */}
        <p className="text-lg text-gray-200 mb-4">
          Jugar de nuevo:
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* Botón Revancha 15 Pts - Llama a onRematch con 15 */}
          <button
            onClick={() => onRematch(15)} // Llama al callback de props
            className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 font-semibold py-3 px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105 text-lg"
          >
            Revancha (15 Pts)
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105 text-lg"
            >
              Salir
            </button>
          )}
          {/* Botón Revancha 30 Pts - Llama a onRematch con 30 */}
          <button
            onClick={() => onRematch(30)} // Llama al callback de props
            className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 font-semibold py-3 px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105 text-lg"
          >
            Revancha (30 Pts)
          </button>
          
        </div>

      </div>
    </div>
  );
};

export default EndGameScreen;