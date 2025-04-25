// src/components/GameLog.tsx
import React, { useRef, useEffect } from 'react';

interface GameLogProps {
    mensajes: string[];
    className?: string;
}

const GameLog: React.FC<GameLogProps> = ({ mensajes, className = '' }) => {
    const logEndRef = useRef<HTMLDivElement>(null); // Ref para hacer scroll automático

    // Efecto para hacer scroll al final cuando llegan nuevos mensajes
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensajes]);

    return (
        <details className={`w-full text-xs ${className}`}>
            <summary className="cursor-pointer text-center text-gray-400 hover:text-white py-1">
                Mostrar/Ocultar Log del Juego
            </summary>
            <div className="h-full overflow-y-auto bg-gray-800 bg-opacity-70 p-2 rounded mt-1 border border-gray-600 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                {mensajes.length === 0 && <p className="text-gray-500 italic">El log está vacío.</p>}
                {mensajes.map((msg, index) => {
                    // Añadir algo de formato o iconos basados en el mensaje (opcional)
                    let style = "text-gray-300";
                    if (msg.startsWith("Debug:")) style = "text-purple-400 opacity-80";
                    if (msg.includes("Gana") || msg.includes("¡")) style = "text-yellow-300 font-semibold";
                    if (msg.includes("Ronda:") || msg.includes("Mano")) style = "text-cyan-300 mt-1";
                    if (msg.startsWith("--") || msg.startsWith("==")) style = "text-green-400 font-bold mt-1";

                    return <p key={index} className={`mb-0.5 ${style}`}>{msg}</p>;
                })}
                {/* Elemento invisible al final para hacer scroll */}
                <div ref={logEndRef} />
            </div>
        </details>
    );
};

export default GameLog;