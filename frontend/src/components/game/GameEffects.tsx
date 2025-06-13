import React, { useEffect, useState } from 'react';
import { VictoryCelebration } from '../animations/CardAnimations';

interface GameEffectsProps {
  gameState: {
    partidaTerminada: boolean;
    ganadorPartida: any;
    ultimoCanto: any;
  };
  onEffectComplete?: () => void;
}

const GameEffects: React.FC<GameEffectsProps> = ({ 
  gameState, 
  onEffectComplete 
}) => {
  const [showVictory, setShowVictory] = useState(false);
  const [isPlayerWinner, setIsPlayerWinner] = useState(false);

  useEffect(() => {
    if (gameState.partidaTerminada && gameState.ganadorPartida) {
      // Determine if the human player won
      const humanPlayerWon = gameState.ganadorPartida.jugador?.esHumano === true;
      setIsPlayerWinner(humanPlayerWon);
      setShowVictory(true);
      
      // Auto-hide victory celebration after some time
      const timer = setTimeout(() => {
        setShowVictory(false);
        onEffectComplete?.();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.partidaTerminada, gameState.ganadorPartida, onEffectComplete]);

  return (
    <>
      {showVictory && (
        <VictoryCelebration 
          winner={isPlayerWinner ? "¡Ganaste!" : "Perdiste"}
          show={showVictory}
          onComplete={() => setShowVictory(false)}
        />
      )}
    </>
  );
};

export default GameEffects;
