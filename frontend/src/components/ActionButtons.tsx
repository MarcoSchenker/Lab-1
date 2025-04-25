// src/components/ActionButtons.tsx
import React from 'react';
import { Canto, AccionesPosibles } from '../game/iaPro/types'; // Ajusta la ruta

interface ActionButtonsProps {
    acciones: AccionesPosibles;
    onCanto: (canto: Canto) => void; // Callback único para todos los cantos/respuestas
    className?: string;
    partidaTerminada: boolean;
}

// Helper para obtener un nombre más legible del Canto para el botón
const getButtonLabel = (canto: Canto): string => {
    switch (canto) {
        case Canto.Envido: return "Envido";
        case Canto.RealEnvido: return "Real Envido";
        case Canto.FaltaEnvido: return "Falta Envido";
        case Canto.EnvidoEnvido: return "Envido Envido";
        case Canto.Truco: return "Truco";
        case Canto.ReTruco: return "Retruco";
        case Canto.ValeCuatro: return "Vale Cuatro";
        case Canto.Quiero: return "¡Quiero!";
        case Canto.NoQuiero: return "No Quiero";
        case Canto.IrAlMazo: return "Ir al Mazo";
        // Añadir otros si es necesario
        default: return canto; // Devuelve la letra si no hay traducción
    }
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    acciones,
    onCanto,
    className = '',
    partidaTerminada
}) => {
    const hasAnyAction = !partidaTerminada && (
        acciones.puedeJugarCarta || // Aunque jugar carta no es un botón aquí
        acciones.puedeCantarEnvido.length > 0 ||
        acciones.puedeCantarTruco.length > 0 ||
        acciones.puedeResponder.length > 0 ||
        acciones.puedeMazo
    );

    // Estilos base para los botones
    const buttonBaseStyle = "text-white font-bold py-2 px-4 rounded shadow hover:shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
    const envidoStyle = "bg-blue-900 hover:bg-blue-950 focus:ring-blue-500";
    const trucoStyle = "bg-red-700 hover:bg-red-600 focus:ring-red-500";
    const respuestaStyle = "bg-yellow-700 hover:bg-yellow-600 text-black focus:ring-yellow-400";
    const mazoStyle = "bg-gray-500 hover:bg-gray-600 focus:ring-gray-500";

    const renderButton = (canto: Canto, style: string) => (
        <button
            key={canto}
            onClick={() => onCanto(canto)}
            className={`${buttonBaseStyle} ${style}`}
        >
            {getButtonLabel(canto)}
        </button>
    );

    return (
        <div className={`max-w-5xl p-3 bg-stone-950 bg-opacity-0 rounded-lg shadow-md mx-auto ${className}`}>
            <div className="flex flex-wrap gap-3 justify-center items-center min-h-[3rem]">
                {/* Botones de Canto Envido */}
                {acciones.puedeCantarEnvido.map(canto => renderButton(canto, envidoStyle))}

                {/* Botones de Canto Truco */}
                {acciones.puedeCantarTruco.map(canto => renderButton(canto, trucoStyle))}

                {/* Botones de Respuesta */}
                {acciones.puedeResponder.map(canto => renderButton(canto, respuestaStyle))}

                {/* Botón Mazo */}
                {acciones.puedeMazo && renderButton(Canto.IrAlMazo, mazoStyle)}

                {/* Indicador si no hay acciones */}
                {!hasAnyAction && !partidaTerminada && (
                    <p className="text-gray-400 italic">Esperando al oponente...</p>
                )}
                {partidaTerminada && (
                     <p className="text-yellow-400 font-bold">¡Partida Terminada!</p>
                )}
            </div>
        </div>
    );
};

export default ActionButtons;