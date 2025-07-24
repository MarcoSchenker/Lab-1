import React from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaCoins, FaChartLine, FaGamepad } from 'react-icons/fa';

interface RecompensaJugador {
  jugadorId: number;
  nombreJugador: string;
  equipoId: string;
  esGanador: boolean;
  
  // ELO
  eloAnterior: number;
  cambioEloPartida: number;
  cambioEloEnvido: number;
  cambioEloTotal: number;
  nuevoElo: number;
  
  // Monedas
  monedasGanadas: number;
  
  // Estadísticas
  nuevasVictorias: number;
  nuevasDerrotas: number;
  nuevasPartidas: number;
  
  // Info envido
  huboEnvido: boolean;
  ganoEnvido: boolean;
  perdioEnvido: boolean;
}

interface RecompensasScreenProps {
  recompensas: { [jugadorId: string]: RecompensaJugador };
  miJugadorId: number;
  onContinuar: () => void;
}

const RecompensasScreen: React.FC<RecompensasScreenProps> = ({ recompensas, miJugadorId, onContinuar }) => {
  const miRecompensa = recompensas[miJugadorId.toString()];
  const recompensasArray = Object.values(recompensas);

  if (!miRecompensa) {
    return null; // No mostrar si no hay recompensas (usuario anónimo)
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
      <motion.div
        className="bg-gradient-to-br from-stone-800 to-stone-900 p-8 rounded-2xl shadow-2xl border-2 border-yellow-500 max-w-2xl w-full mx-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center mb-6" variants={itemVariants}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaTrophy className={`text-3xl ${miRecompensa.esGanador ? 'text-yellow-400' : 'text-gray-400'}`} />
            <h2 className="text-3xl font-bold text-yellow-300">
              {miRecompensa.esGanador ? '¡VICTORIA!' : 'DERROTA'}
            </h2>
            <FaTrophy className={`text-3xl ${miRecompensa.esGanador ? 'text-yellow-400' : 'text-gray-400'}`} />
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
        </motion.div>

        {/* Recompensas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* ELO */}
          <motion.div
            className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-xl"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3 mb-2">
              <FaChartLine className="text-xl text-blue-200" />
              <h3 className="text-lg font-semibold text-white">ELO Rating</h3>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {miRecompensa.eloAnterior} → {miRecompensa.nuevoElo}
              </div>
              <div className={`text-lg font-semibold ${
                miRecompensa.cambioEloTotal >= 0 ? 'text-green-300' : 'text-red-300'
              }`}>
                {miRecompensa.cambioEloTotal >= 0 ? '+' : ''}{miRecompensa.cambioEloTotal} puntos
              </div>
              {miRecompensa.huboEnvido && (
                <div className="text-sm text-blue-200 mt-1">
                  Partida: {miRecompensa.cambioEloPartida >= 0 ? '+' : ''}{miRecompensa.cambioEloPartida}, 
                  Envido: {miRecompensa.cambioEloEnvido >= 0 ? '+' : ''}{miRecompensa.cambioEloEnvido}
                </div>
              )}
            </div>
          </motion.div>

          {/* Monedas */}
          <motion.div
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 rounded-xl"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3 mb-2">
              <FaCoins className="text-xl text-yellow-200" />
              <h3 className="text-lg font-semibold text-white">Monedas</h3>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                +{miRecompensa.monedasGanadas}
              </div>
              <div className="text-sm text-yellow-200">
                {miRecompensa.esGanador ? 'Premio por victoria' : 'Sin recompensa'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Información adicional del envido */}
        {miRecompensa.huboEnvido && (
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-xl mb-4"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3 mb-2">
              <FaGamepad className="text-xl text-purple-200" />
              <h3 className="text-lg font-semibold text-white">Información del Envido</h3>
            </div>
            <div className="text-center text-white">
              {miRecompensa.ganoEnvido ? (
                <span className="text-green-300 font-semibold">¡Ganaste el envido! (+1 ELO)</span>
              ) : (
                <span className="text-red-300 font-semibold">Perdiste el envido (-1 ELO)</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Estadísticas generales */}
        <motion.div
          className="bg-stone-700 p-4 rounded-xl mb-6"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-white mb-3 text-center">Estadísticas Actualizadas</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{miRecompensa.nuevasVictorias}</div>
              <div className="text-sm text-gray-300">Victorias</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{miRecompensa.nuevasDerrotas}</div>
              <div className="text-sm text-gray-300">Derrotas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{miRecompensa.nuevasPartidas}</div>
              <div className="text-sm text-gray-300">Jugadas</div>
            </div>
          </div>
        </motion.div>

        {/* Resultados de todos los jugadores */}
        {recompensasArray.length > 1 && (
          <motion.div
            className="bg-stone-700 p-4 rounded-xl mb-6"
            variants={itemVariants}
          >
            <h3 className="text-lg font-semibold text-white mb-3 text-center">Resultados de la Partida</h3>
            <div className="space-y-2">
              {recompensasArray.map((recompensa) => (
                <div
                  key={recompensa.jugadorId}
                  className={`flex justify-between items-center p-2 rounded-lg ${
                    recompensa.jugadorId === miJugadorId ? 'bg-blue-600' : 'bg-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {recompensa.esGanador && <FaTrophy className="text-yellow-400" />}
                    <span className="text-white font-medium">{recompensa.nombreJugador}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      recompensa.cambioEloTotal >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}>
                      ELO: {recompensa.cambioEloTotal >= 0 ? '+' : ''}{recompensa.cambioEloTotal}
                    </div>
                    <div className="text-yellow-300 text-sm">
                      +{recompensa.monedasGanadas} monedas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Botón continuar */}
        <motion.div className="text-center" variants={itemVariants}>
          <button
            onClick={onContinuar}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Continuar
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RecompensasScreen;
