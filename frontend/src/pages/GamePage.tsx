// src/components/GamePage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Importar Lógica del Juego ---
// Ajusta estas rutas si tu estructura es diferente
import { Partida } from '../game/iaPro/partida';
import { Jugador } from '../game/iaPro/jugador';
import { IA } from '../game/iaPro/ia';
import { Naipe } from '../game/iaPro/naipe';
import { Canto, AccionesPosibles, Equipo } from '../game/iaPro/types';
import { GameCallbacks } from '../game/game-callbacks'; // Asegúrate que esta ruta es correcta

// --- Importar Componentes de UI ---
// Ajusta estas rutas si tu estructura es diferente
import PlayerArea from '../components/PlayerArea';
import GameBoard from '../components/GameBoard';
import Scoreboard from '../components/ScoreBoard';
import ActionButtons from '../components/ActionButtons';
import GameLog from '../components/GameLog';

// --- Interfaz para el Estado de React ---
interface GameState {
    partidaTerminada: boolean;
    equipoPrimero: Equipo | null; // Humano
    equipoSegundo: Equipo | null; // IA
    cartasManoJugador: Naipe[];
    cartasMesa: (Naipe | null)[];
    turnoActual: Equipo | null;
    accionesPosibles: AccionesPosibles;
    mensajeLog: string[];
    ultimoCanto: { jugador: Jugador | null, mensaje: string } | null;
    numeroManoActual: number; // Para saber qué mano se está jugando
}

// --- Estado Inicial ---
const initialState: GameState = {
    partidaTerminada: false,
    equipoPrimero: null,
    equipoSegundo: null,
    cartasManoJugador: [],
    cartasMesa: Array(6).fill(null),
    turnoActual: null,
    accionesPosibles: {
        puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false,
    },
    mensajeLog: [],
    ultimoCanto: null,
    numeroManoActual: 0, // Empieza en mano 0
};

// --- Constante para la ruta de las imágenes ---
// ¡IMPORTANTE! Asegúrate que esta ruta sea correcta desde la RAÍZ PÚBLICA de tu servidor web
const IMAGE_BASE_PATH = 'frontend/public/cartas/mazoOriginal'; // Ejemplo si 'cartas' está dentro de 'public'

// --- Componente Principal de la Página del Juego ---
const GamePage: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(initialState);

    // --- Instancia de la Partida y Bridge UI<->Lógica ---
    const partida = useMemo(() => {
        // Objeto que contiene los callbacks que la lógica del juego usará para actualizar React
        const reactUIBridge: GameCallbacks = {
             setPartidaTerminada: () => setGameState(prev => ({ ...prev, partidaTerminada: true })),
             setTurno: (equipo) => setGameState(prev => ({ ...prev, turnoActual: equipo })),
             displayLog: (message) => setGameState(prev => ({ ...prev, mensajeLog: [message, ...prev.mensajeLog.slice(0, 99)] })), // Limita el log a 100 mensajes
             clearLog: () => setGameState(prev => ({ ...prev, mensajeLog: [] })),
             updateScores: (score1, score2) => setGameState(prev => ({
                 ...prev,
                 equipoPrimero: prev.equipoPrimero ? { ...prev.equipoPrimero, puntos: score1 } : null,
                 equipoSegundo: prev.equipoSegundo ? { ...prev.equipoSegundo, puntos: score2 } : null,
             })),
             updatePlayerNames: (name1, name2) => { /* Se maneja al asignar jugadores */ },
             displayPlayerCards: (jugador) => {
                 if (jugador.esHumano) {
                     setGameState(prev => ({ ...prev, cartasManoJugador: [...jugador.cartasEnMano] })); // Importante clonar array
                 }
             },
             clearPlayedCards: () => setGameState(prev => ({ ...prev, cartasMesa: Array(6).fill(null) })),
             displayPlayedCard: (jugador, carta, manoNumero, jugadaEnMano) => {
                 setGameState(prev => {
                     const nuevaMesa = [...prev.cartasMesa];
                     // Determinar índice correcto en la mesa [J1M0, J2M0, J1M1, J2M1, J1M2, J2M2]
                     // Necesita saber quién es Jugador 1 (índice par) y Jugador 2 (índice impar)
                     // Asumiendo que equipoPrimero es SIEMPRE el índice par (0, 2, 4)
                     const playerIndex = prev.equipoPrimero?.jugador === jugador ? 0 : 1;
                     const mesaIndex = manoNumero * 2 + playerIndex;

                     if (mesaIndex < nuevaMesa.length) {
                        nuevaMesa[mesaIndex] = carta;
                     } else {
                         console.error(`Índice de mesa inválido ${mesaIndex} calculado en callback displayPlayedCard para mano ${manoNumero}, jugador ${playerIndex}`);
                     }
                     return { ...prev, cartasMesa: nuevaMesa };
                 });
             },
             showPlayerCall: (jugador, mensaje) => {
                 const cantoTraducido = Object.entries(Canto).find(([key, val]) => val === mensaje)?.[0] ?? mensaje;
                 setGameState(prev => ({ ...prev, ultimoCanto: { jugador, mensaje: cantoTraducido } }));
                 setTimeout(() => {
                     setGameState(prev => prev.ultimoCanto?.mensaje === cantoTraducido ? { ...prev, ultimoCanto: null } : prev);
                 }, 2500); // Tiempo para leer el canto
             },
             actualizarAccionesPosibles: (acciones) => {
                 if (process.env.NODE_ENV === 'development') { // Log solo en desarrollo
                     console.log("Acciones Posibles:", acciones);
                 }
                 setGameState(prev => ({ ...prev, accionesPosibles: acciones }));
             },
             setNumeroMano: (mano) => { // Implementar callback para número de mano
                  if (process.env.NODE_ENV === 'development') {
                      console.log("Actualizando número de mano a:", mano);
                  }
                  setGameState(prev => ({...prev, numeroManoActual: mano}))
             },
             // Opcionales (puedes añadir la implementación si los necesitas)
             // highlightWinningCard: (ganador, manoNumero, jugadaEnManoGanadora) => { /* Lógica para resaltar visualmente */ },
             // displayRoundWinner: (winnerName) => { /* Lógica para mostrar mensaje destacado */ },
        };

        // Crear instancia de la lógica del juego, pasándole los callbacks
        const p = new Partida(reactUIBridge, true); // Debug mode activado por defecto
        return p;

    }, []); // El array vacío asegura que la instancia de Partida se cree solo una vez

    // --- Efecto para iniciar la partida al montar el componente ---
    useEffect(() => {
        // Asigna referencias iniciales a los equipos en el estado
        setGameState(prev => ({
            ...prev,
            equipoPrimero: partida.equipoPrimero,
            equipoSegundo: partida.equipoSegundo,
        }));
        // Inicia la lógica de la partida
        partida.iniciar("Humano", "IA Pro", 15); // Puedes cambiar nombres y límite

    }, [partida]); // Depende de la instancia de partida

    // --- Handlers para acciones del usuario que llaman a la lógica ---
    const handlePlayCard = useCallback((index: number) => {
        // Validar si la acción es permitida ANTES de llamar a la lógica
        if (!gameState.partidaTerminada && gameState.turnoActual === gameState.equipoPrimero && gameState.accionesPosibles.puedeJugarCarta) {
            partida.handleHumanPlayCard(index);
        } else {
            console.warn("Intento de jugar carta bloqueado por UI (fuera de turno o acción no permitida).");
            // Opcional: Mostrar feedback al usuario
        }
    }, [partida, gameState.partidaTerminada, gameState.turnoActual, gameState.equipoPrimero, gameState.accionesPosibles.puedeJugarCarta]);

    const handleCanto = useCallback((canto: Canto) => {
        // Validar si la acción es permitida ANTES de llamar a la lógica
        if (!gameState.partidaTerminada && gameState.turnoActual === gameState.equipoPrimero) {
            const acciones = gameState.accionesPosibles;
            const esCantoValido = acciones.puedeCantarEnvido.includes(canto) || acciones.puedeCantarTruco.includes(canto) || (canto === Canto.IrAlMazo && acciones.puedeMazo);
            const esRespuestaValida = acciones.puedeResponder.includes(canto);

            if (esCantoValido || esRespuestaValida) {
                partida.handleHumanCanto(canto);
            } else {
                console.warn(`Intento de canto/respuesta ${canto} bloqueado por UI (acción no permitida).`);
                // Opcional: Mostrar feedback al usuario
            }
        } else {
            console.warn("Intento de cantar bloqueado por UI (fuera de turno).");
             // Opcional: Mostrar feedback al usuario
        }
    }, [partida, gameState.partidaTerminada, gameState.turnoActual, gameState.equipoPrimero, gameState.accionesPosibles]);

    // --- Renderizado de la Interfaz ---
    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-green-800 to-green-900 text-white p-4 font-sans selection:bg-yellow-300 selection:text-black">

            <Scoreboard
                equipoPrimero={gameState.equipoPrimero}
                equipoSegundo={gameState.equipoSegundo}
                limitePuntaje={partida.limitePuntaje}
                className="mb-4"
            />

            <div className="w-full max-w-5xl bg-green-700 bg-opacity-80 p-4 md:p-6 rounded-xl shadow-2xl border-4 border-yellow-800 border-opacity-60 backdrop-blur-sm">
                <div className="space-y-4 md:space-y-6">

                    <PlayerArea
                        jugador={gameState.equipoSegundo?.jugador ?? null}
                        cartas={Array(gameState.equipoSegundo?.jugador?.cartasEnMano?.length ?? 3).fill(null)}
                        esTurno={gameState.turnoActual === gameState.equipoSegundo}
                        ultimoCanto={gameState.ultimoCanto && gameState.ultimoCanto.jugador === gameState.equipoSegundo?.jugador ? gameState.ultimoCanto.mensaje : null}
                        onCardClick={() => {}}
                        puedeJugarCarta={false}
                        imageBasePath={IMAGE_BASE_PATH}
                    />

                    <GameBoard
                        cartasMesa={gameState.cartasMesa}
                        equipoPrimero={gameState.equipoPrimero}
                        equipoSegundo={gameState.equipoSegundo}
                        numeroManoActual={gameState.numeroManoActual} // Usa el estado actualizado
                        imageBasePath={IMAGE_BASE_PATH}
                    />

                    <PlayerArea
                        jugador={gameState.equipoPrimero?.jugador ?? null}
                        cartas={gameState.cartasManoJugador}
                        esTurno={gameState.turnoActual === gameState.equipoPrimero}
                        ultimoCanto={gameState.ultimoCanto && gameState.ultimoCanto.jugador === gameState.equipoPrimero?.jugador ? gameState.ultimoCanto.mensaje : null}
                        onCardClick={handlePlayCard}
                        puedeJugarCarta={gameState.accionesPosibles.puedeJugarCarta && !gameState.partidaTerminada} // Añadir chequeo partidaTerminada
                        imageBasePath={IMAGE_BASE_PATH}
                    />
                </div>
            </div>

            <ActionButtons
                acciones={gameState.accionesPosibles}
                onCanto={handleCanto}
                partidaTerminada={gameState.partidaTerminada}
                className="mt-4 w-full max-w-4xl" // Hacer que ocupe ancho
            />

            <GameLog
                mensajes={gameState.mensajeLog}
                className="w-full max-w-4xl mt-4"
            />

        </div>
    );
};

export default GamePage;