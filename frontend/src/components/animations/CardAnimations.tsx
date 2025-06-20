// Enhanced Animation System for Truco Game
// File: /frontend/src/components/animations/CardAnimations.tsx

import React, { useEffect, useState } from 'react';
import './CardAnimations.css';

interface CardAnimationProps {
  type: 'deal' | 'play' | 'win' | 'flip';
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export const CardAnimation: React.FC<CardAnimationProps> = ({
  type,
  duration = 300,
  delay = 0,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationClass = () => {
    switch (type) {
      case 'deal':
        return 'card-deal-animation';
      case 'play':
        return 'card-play-animation';
      case 'win':
        return 'card-win-animation';
      case 'flip':
        return 'card-flip-animation';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`card-animation-wrapper ${getAnimationClass()} ${isVisible ? 'visible' : ''}`}
      style={{ 
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

// Victory Celebration Component
interface VictoryCelebrationProps {
  winner: string;
  show: boolean;
  onComplete: () => void;
}

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({
  winner,
  show,
  onComplete
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="victory-celebration-overlay">
      <div className="victory-content">
        <div className="victory-fireworks">
          <div className="firework"></div>
          <div className="firework"></div>
          <div className="firework"></div>
        </div>
        <h1 className="victory-title">¡{winner} Gana!</h1>
        <div className="victory-confetti">
          {Array.from({length: 50}).map((_, i) => (
            <div key={i} className={`confetti confetti-${i % 5}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Turn Indicator Component
interface TurnIndicatorProps {
  currentPlayer: string;
  isMyTurn: boolean;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  currentPlayer,
  isMyTurn
}) => {
  return (
    <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'other-turn'}`}>
      <div className="turn-pulse"></div>
      <span className="turn-text">
        {isMyTurn ? '¡Tu turno!' : `Turno de ${currentPlayer}`}
      </span>
    </div>
  );
};

export default CardAnimation;
