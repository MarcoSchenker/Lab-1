// src/components/Card.tsx
import React, { useState, useEffect } from 'react';
import { Naipe } from '../game/iaPro/naipe';
import { Palo } from '../game/iaPro/types';

interface CardProps {
    carta: Naipe | null; // La carta a mostrar, o null para un placeholder/dorso
    bocaAbajo?: boolean; // Forzar mostrar el dorso incluso si hay carta
    onClick?: () => void; // Función a llamar al hacer clic (si es aplicable)
    disabled?: boolean; // Si la carta no es interactiva
    className?: string; // Clases adicionales para styling
    imageBasePath?: string; // Ruta base para las imágenes (ej: '/cartas/mazoOriginal')
}

// Función helper para obtener el nombre de archivo correcto según tu formato
function getNaipeImageFilename(carta: Naipe): string {
    // Mapeo de Palo a nombre en inglés para archivo
    let paloArchivo: string;
    switch (carta.palo) {
        case Palo.Oro:    paloArchivo = 'Gold'; break;
        case Palo.Copa:   paloArchivo = 'Cups'; break;
        case Palo.Espada: paloArchivo = 'Swords'; break;
        case Palo.Basto:  paloArchivo = 'Bastos'; break;
        default:          paloArchivo = carta.palo; // Fallback
    }
    const numeroArchivo = carta.numero;
    return `${numeroArchivo}${paloArchivo}`; // Devolvemos sin extensión
}

const Card: React.FC<CardProps> = ({
    carta,
    bocaAbajo = false,
    onClick,
    disabled = false,
    className = '',
    imageBasePath = '/cartas/mazoOriginal',
}) => {
    // Estado para manejar errores de carga de imagen
    const [imageExtension, setImageExtension] = useState<string>('.jpg');
    const [isImageError, setIsImageError] = useState<boolean>(false);
    
    // Reiniciar estado de error cuando cambia la carta o la ruta base
    useEffect(() => {
        setIsImageError(false);
        setImageExtension('.jpg'); // Intentar primero con jpg
    }, [carta, imageBasePath]);

    const esClickeable = onClick && !disabled && !bocaAbajo && carta;

    const handleClick = () => {
        if (esClickeable) {
            onClick();
        }
    };

    // Función para manejar errores de carga de imagen
    const handleImageError = () => {
        if (imageExtension === '.jpg') {
            // Si falla .jpg, intentar con .png
            setImageExtension('.png');
        } else {
            // Si ambos fallan, marcar como error definitivo
            setIsImageError(true);
        }
    };

    // Determinar el nombre del archivo de imagen
    let imageFileName: string;
    if (bocaAbajo || !carta) {
        // Para el dorso, intenta ambas extensiones
        imageFileName = `reverse${imageExtension}`;
    } else {
        // Para carta normal
        const baseFileName = getNaipeImageFilename(carta);
        imageFileName = `${baseFileName}${imageExtension}`;
    }

    const imageSrc = `${imageBasePath}/${imageFileName}`;
    
    // Imagen de respaldo (fallback) si ambas extensiones fallan
    const fallbackImageSrc = '/cartas/mazoOriginal/reverse.png';
    
    const altText = (bocaAbajo || !carta) ? 'Carta' : carta.getNombre();

    const baseClasses = 'w-36 h-auto md:w-24 lg:w-32 rounded shadow-md transition-all duration-200 ease-in-out border border-black';
    const clickableClasses = esClickeable ? 'cursor-pointer hover:scale-105 hover:-translate-y-1 hover:shadow-lg' : '';
    const disabledClasses = disabled && carta ? 'cursor-not-allowed' : '';

    return (
        <div
            className={`${baseClasses} ${clickableClasses} ${disabledClasses} ${className}`}
            onClick={handleClick}
            aria-disabled={!esClickeable}
            role={esClickeable ? 'button' : undefined}
            title={esClickeable ? `Jugar ${altText}` : altText}
            tabIndex={esClickeable ? 0 : undefined}
            onKeyPress={esClickeable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
        >
            <img
                src={isImageError ? fallbackImageSrc : imageSrc}
                alt={altText}
                className="w-full h-full object-contain rounded block"
                loading="lazy"
                onError={handleImageError}
            />
        </div>
    );
};

export default Card;