import React from 'react';
import { useNavigate } from 'react-router-dom';

const ElegirDificultad: React.FC = () => {
  const navigate = useNavigate();

  const seleccionarDificultad = async (dificultad: 'facil' | 'dificil') => {
    if (dificultad === 'dificil') {
      try {
        const ia = await import('../game/iaPro/ia'); // Importación dinámica de ia.js
        console.log('IA cargada para dificultad difícil:', ia);
      } catch (error) {
        console.error('Error al cargar la IA:', error);
      }
      navigate('/game-page'); // Redirigir a GamePage
    } else {
      navigate(`/jugar-offline?dificultad=${dificultad}`); // Redirigir a jugar-offline con dificultad fácil
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Elegí la dificultad</h2>
      <div className="space-y-4">
        <button
          onClick={() => seleccionarDificultad('facil')}
          className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
        >
          Fácil
        </button>
        <button
          onClick={() => seleccionarDificultad('dificil')}
          className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          Difícil
        </button>
      </div>
    </div>
  );
};

export default ElegirDificultad;