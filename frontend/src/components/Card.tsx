// src/components/Card.tsx
import React from 'react';
import { Naipe } from '../game/iaPro/naipe'; // Ajusta la ruta si es necesario
import { Palo } from '../game/iaPro/types'; // Importar Palo para el mapeo

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
         case Palo.Espada: paloArchivo = 'Swords'; break; // Espada -> Swords
         case Palo.Basto:  paloArchivo = 'Bastos'; break; // Basto -> Bastos
         default:          paloArchivo = carta.palo; // Fallback (no debería ocurrir)
     }
     const numeroArchivo = carta.numero; // Usar el número (1-12)
     // Asumiendo extensión .png (ajusta si es diferente)
     return `${numeroArchivo}${paloArchivo}.jpg`;
}


const Card: React.FC<CardProps> = ({
    carta,
    bocaAbajo = false,
    onClick,
    disabled = false,
    className = '',
    // Asegúrate que la ruta base sea correcta desde la raíz de tu servidor web
    // Si las imágenes están en la carpeta 'public', la ruta probablemente sea así:
    imageBasePath = '/cartas/mazoOriginal',
}) => {
    const esClickeable = onClick && !disabled && !bocaAbajo && carta;
    //const esClickeable = true;


    const handleClick = () => {
        if (esClickeable) {
            onClick();
        }
    };

    // Determinar el nombre del archivo de imagen
    const imageFilename = (bocaAbajo || !carta)
        ? 'reverse.png' // Nombre exacto del archivo del reverso
        : getNaipeImageFilename(carta); // Obtener nombre de archivo específico

    const imageSrc = `${imageBasePath}/${imageFilename}`;

    const altText = (bocaAbajo || !carta) ? 'Carta' : carta.getNombre();

    const baseClasses = 'w-36 h-auto md:w-24 lg:w-32 rounded shadow-md transition-all duration-200 ease-in-out border border-black';
    const clickableClasses = esClickeable ? 'cursor-pointer hover:scale-105 hover:-translate-y-1 hover:shadow-lg' : '';
    const disabledClasses = disabled && carta ? 'cursor-not-allowed' : '';

    return (
        <div
            className={`${baseClasses} ${clickableClasses} ${disabledClasses} ${className}`}
            onClick={handleClick}
            // Atributos para accesibilidad
            aria-disabled={!esClickeable}
            role={esClickeable ? 'button' : undefined}
            title={esClickeable ? `Jugar ${altText}` : altText} // Tooltip
            tabIndex={esClickeable ? 0 : undefined} // Permite focus con teclado si es clickeable
            onKeyPress={esClickeable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined} // Permite activar con Enter/Espacio
        >
            <img
                src={imageSrc}
                alt={altText}
                className="w-full h-full object-contain rounded block" // 'block' para evitar espacio extra debajo
                loading="lazy" // Carga diferida para imágenes
            />
        </div>
    );
};

export default Card;