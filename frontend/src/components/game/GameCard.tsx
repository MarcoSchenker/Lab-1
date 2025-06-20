// src/components/game/GameCard.tsx
import React, { useState, useCallback } from 'react';
import { getCardImagePath, getCardImageFallback, getCardBackImagePath, normalizeSkinName } from '../../utils/cardImageUtils';

interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

interface GameCardProps {
  carta: Carta;
  skinName?: string;
  isPlayable?: boolean;
  isPlayed?: boolean;
  showBack?: boolean;
  onClick?: (carta: Carta) => void;
  className?: string;
  showValues?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const GameCard: React.FC<GameCardProps> = ({
  carta,
  skinName = 'Original',
  isPlayable = false,
  isPlayed = false,
  showBack = false,
  onClick,
  className = '',
  showValues = false,
  size = 'medium'
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const normalizedSkin = normalizeSkinName(skinName);

  // Determinar la imagen a mostrar
  let imageSrc: string;
  if (showBack) {
    imageSrc = getCardBackImagePath(normalizedSkin);
  } else if (fallbackError) {
    // Si falló todo, mostrar el dorso
    imageSrc = getCardBackImagePath('Original');
  } else if (imageError) {
    // Si falló la imagen principal, usar fallback
    imageSrc = getCardImageFallback(carta);
  } else {
    // Imagen principal
    imageSrc = getCardImagePath(carta, normalizedSkin);
  }

  const handleImageError = useCallback(() => {
    if (!imageError) {
      console.warn(`❌ Error cargando imagen de carta ${carta.numero} de ${carta.palo} con skin ${normalizedSkin}`);
      console.log(`Ruta fallida: ${imageSrc}`);
      setImageError(true);
    } else if (!fallbackError) {
      console.error(`❌ Error cargando imagen de fallback para carta ${carta.numero} de ${carta.palo}`);
      console.log(`Ruta fallback: ${getCardImageFallback(carta)}`);
      setFallbackError(true);
    } else {
      console.error(`❌ Error crítico: No se pudo cargar ninguna imagen para carta ${carta.numero} de ${carta.palo}`);
    }
  }, [carta.numero, carta.palo, normalizedSkin, imageError, fallbackError, imageSrc]);

  const handleClick = useCallback(() => {
    if (isPlayable && onClick && !isPlayed) {
      console.log(`🃏 Jugando carta: ${carta.numero} de ${carta.palo}`);
      onClick(carta);
    }
  }, [isPlayable, onClick, isPlayed, carta]);

  // Clases CSS según el tamaño
  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-24 h-36',
    large: 'w-28 h-42'
  };

  // Clases base
  const baseClasses = [
    'game-card',
    'relative',
    'rounded-lg',
    'shadow-md',
    'transition-all',
    'duration-200',
    'border',
    'border-gray-300',
    sizeClasses[size]
  ].join(' ');

  // Clases condicionales
  const conditionalClasses = [
    isPlayable && !isPlayed ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-1 border-blue-400 ring-2 ring-blue-200' : '',
    isPlayed ? 'opacity-60 grayscale' : '',
    !isPlayable ? 'cursor-default' : '',
    className
  ].filter(Boolean).join(' ');

  const finalClasses = `${baseClasses} ${conditionalClasses}`;

  return (
    <div 
      className={finalClasses}
      onClick={handleClick}
      title={showBack ? 'Carta oculta' : `${carta.numero} de ${carta.palo} (E:${carta.valorEnvido}, T:${carta.valorTruco})`}
    >
      {/* Imagen de la carta */}
      <img
        src={imageSrc}
        alt={showBack ? 'Carta oculta' : `${carta.numero} de ${carta.palo}`}
        className="w-full h-full object-cover rounded-lg"
        onError={handleImageError}
        loading="lazy"
      />

      {/* Overlay para cartas jugadas */}
      {isPlayed && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">JUGADA</span>
        </div>
      )}

      {/* Valores de envido y truco */}
      {showValues && !showBack && !isPlayed && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg">
          <div className="flex justify-between">
            <span>E: {carta.valorEnvido}</span>
            <span>T: {carta.valorTruco}</span>
          </div>
        </div>
      )}

      {/* Indicador de carta jugable */}
      {isPlayable && !isPlayed && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
      )}

      {/* Indicador de error de imagen */}
      {(imageError || fallbackError) && !showBack && (
        <div className="absolute top-1 left-1 w-3 h-3 bg-red-500 rounded-full" title="Error cargando imagen"></div>
      )}
    </div>
  );
};

export default GameCard;