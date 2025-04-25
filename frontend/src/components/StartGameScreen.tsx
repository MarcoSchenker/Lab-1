// src/components/StartGameScreen.tsx
import React from 'react';

// Definimos las props que el componente recibirá
interface StartGameScreenProps {
  // Una función callback que se llamará cuando el usuario elija los puntos
  // Esta función recibirá el límite de puntos (15 o 30) como argumento.
  onStartGame: (puntosLimite: 15 | 30) => void;
  onExit?: () => void; // Función opcional para salir del juego
}

const StartGameScreen: React.FC<StartGameScreenProps> = ({ onStartGame, onExit}) => {
  const doradoClaro = 'yellow-500';
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-0 backdrop-blur-sm">
      {/* El cartel principal */}
      <div className="bg-stone-800 bg-opacity-95 p-8 md:p-12 rounded-lg shadow-xl border-2 border-yellow-600 w-full max-w-md mx-auto text-center">

        {/* Título */}
        <h2 className="text-3xl md:text-4xl font-bold text-yellow-300 mb-4 tracking-wider">
          TRUCHO ARGENTINO
        </h2>

        {/* Separador Decorativo */}
        <div className="flex items-center my-4 w-2/3 mx-auto">
            <div className={`flex-grow h-px bg-gradient-to-r from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
            <div className={`text-3xl text-${doradoClaro} mx-2`}>⚜️</div>
            <div className={`flex-grow h-px bg-gradient-to-l from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
        </div>

        {/* Subtítulo */}
        <p className="text-xl text-gray-200 mb-8">
          Elige los puntos para la partida:
        </p>

        {/* Botones de Selección */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* Botón para 15 puntos - Llama a onStartGame con 15 */}
          <button
            onClick={() => onStartGame(15)} // Llama al callback recibido en props
            className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 font-semibold py-3 px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105 text-lg"
          >
            Jugar a 15 Puntos
          </button>
          {/* Botón para 30 puntos - Llama a onStartGame con 30 */}
          <button
            onClick={() => onStartGame(30)} // Llama al callback recibido en props
            className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 font-semibold py-3 px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105 text-lg"
          >
            Jugar a 30 Puntos
          </button>
        </div>

        {/* Separador Decorativo Inferior */}
        <div className="flex items-center my-4 w-2/3 mx-auto">
            <div className={`flex-grow h-px bg-gradient-to-r from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
            <div className={`text-3xl text-${doradoClaro} mx-2`}>⚜️</div>
            <div className={`flex-grow h-px bg-gradient-to-l from-transparent via-${doradoClaro} to-${doradoClaro}`}></div>
        </div>
        {/* Link de Salir */}
        {onExit && ( // Muestra el link solo si se proporciona la función onExit
          <button
            onClick={onExit}
            className={`block mx-auto text-gray-700 hover:text-gray-500 cursor-pointer text-lg mt-4 leading-none focus:outline-none focus:underline`}
          >
            Salir
          </button>
        )}
      </div>
    </div>
  );
};

export default StartGameScreen;