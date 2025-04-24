// src/pages/GamePage.tsx
import React, { useState, useMemo, useCallback } from 'react'; // Quité useRef
import { Partida } from '../game/iaPro/partida';
import { Jugador } from '../game/iaPro/jugador';
import { Naipe } from '../game/iaPro/naipe';
import { Canto, AccionesPosibles, Equipo } from '../game/iaPro/types';
import { GameCallbacks, LogType } from '../game/game-callbacks';
import PlayerArea from '../components/PlayerArea';
import GameBoard from '../components/GameBoard';
import Scoreboard from '../components/ScoreBoard';
import ActionButtons from '../components/ActionButtons';
import GameLog from '../components/GameLog';
import CallDisplay from '../components/CallDisplay';

// Interfaz para las cartas que van a la mesa, incluyendo info para la UI
interface CartaConInfoUI extends Naipe {
  esHumano?: boolean;
}

// Interfaz actualizada para GameState
interface GameState {
    partidaTerminada: boolean;
    partidaIniciada: boolean;
    equipoPrimero: Equipo | null;
    equipoSegundo: Equipo | null;
    cartasManoJugador: Naipe[]; // La mano solo necesita Naipe normal
    cartasMesa: (CartaConInfoUI | null)[][]; // La mesa necesita saber quién jugó
    turnoActual: Equipo | null;
    accionesPosibles: AccionesPosibles;
    mensajeLog: string[]; // Podrías hacer un tipo más complejo { message: string, type: LogType }
    ultimoCanto: { jugador: Jugador | null, mensaje: string } | null;
    numeroManoActual: number; // Mano 0, 1, 2
    mostrandoCartelReparto: boolean;
}

// Estado inicial actualizado
const initialState: GameState = {
    partidaTerminada: false,
    partidaIniciada: false,
    equipoPrimero: null,
    equipoSegundo: null,
    cartasManoJugador: [],
    cartasMesa: [[], [], []], // Inicialmente vacío
    turnoActual: null,
    accionesPosibles: {
        puedeJugarCarta: false,
        puedeCantarEnvido: [],
        puedeCantarTruco: [],
        puedeResponder: [],
        puedeMazo: false,
    },
    mensajeLog: [],
    ultimoCanto: null,
    numeroManoActual: 0,
    mostrandoCartelReparto: false, // Empieza sin mostrar
};

const IMAGE_BASE_PATH = '/cartas/mazoOriginal'; // Asegúrate que la ruta es correcta desde public/

// --- Componente Principal ---
const GamePage: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(initialState);

    // La ref yaMostroRepartoRef ya no es necesaria

    const partida = useMemo(() => {
        // --- Implementación de los Callbacks para la Lógica del Juego ---
        const reactUIBridge: GameCallbacks = {

            // --- Callbacks de Estado General ---
            setPartidaTerminada: () => {
                console.log("UI Callback: Partida Terminada");
                setGameState(prev => ({ ...prev, partidaTerminada: true }));
            },
            setTurno: (equipo) => {
                // console.log("UI Callback: Turno de", equipo.jugador.nombre); // Mucho log, opcional
                setGameState(prev => ({ ...prev, turnoActual: equipo }));
            },
            setNumeroMano: (mano) => {
                console.log("UI Callback: Actualizando a Mano", mano + 1);
                setGameState(prev => ({ ...prev, numeroManoActual: mano }));
            },
            clearLog: () => {
                console.log("UI Callback: Limpiando Log");
                setGameState(prev => ({ ...prev, mensajeLog: [] }));
            },
             // Ajustado para simplificar, asumiendo que LogType no se usa visualmente aún
            displayLog: (message, type: LogType = 'public') => {
                // Podrías filtrar por type aquí si quieres logs separados
                if (type === 'debug' && !true /* Podrías tener un estado para modo debug UI */) {
                     return; // No mostrar logs de debug si no está activo
                }
                 setGameState(prev => ({
                     ...prev,
                     mensajeLog: [`(${type}) ${message}`, ...prev.mensajeLog.slice(0, 99)], // Añadir tipo al mensaje
                 }));
            },

             // --- Callbacks de Estado Visual ---
            updateScores: (score1, score2) => {
                console.log("UI Callback: Actualizando Scores", score1, score2);
                setGameState(prev => ({
                    ...prev,
                    equipoPrimero: prev.equipoPrimero ? { ...prev.equipoPrimero, puntos: score1 } : null,
                    equipoSegundo: prev.equipoSegundo ? { ...prev.equipoSegundo, puntos: score2 } : null,
                }));
            },
            updatePlayerNames: (name1, name2) => {
                 console.log("UI Callback: Actualizando Nombres", name1, name2);
                 // Esto debería idealmente ocurrir antes de que los equipos se creen en el estado
                 // Si los equipos ya existen, actualizarlos (cuidado con la inmutabilidad)
                 setGameState(prev => ({
                     ...prev,
                     equipoPrimero: prev.equipoPrimero ? { ...prev.equipoPrimero, jugador: { ...prev.equipoPrimero.jugador, nombre: name1 } as Jugador } : null,
                     equipoSegundo: prev.equipoSegundo ? { ...prev.equipoSegundo, jugador: { ...prev.equipoSegundo.jugador, nombre: name2 } as Jugador } : null,
                 }));
            },
            displayPlayerCards: (jugador) => {
                if (jugador.esHumano) {
                     console.log("UI Callback: Mostrando cartas jugador humano", jugador.cartasEnMano);
                    setGameState(prev => ({
                        ...prev,
                        // Asegura que se actualiza con una nueva referencia de array
                        cartasManoJugador: [...jugador.cartasEnMano],
                    }));
                }
                // Nota: Podrías querer actualizar el número de cartas de la IA aquí
                // para mostrar los dorsos correctamente, si PlayerArea lo soporta.
            },

            displayPlayedCard: (jugador, carta, manoNumero, jugadaEnMano) => {
                 console.log(`UI Callback: Carta jugada por ${jugador.nombre} en mano ${manoNumero + 1}`, carta);
                 setGameState(prev => {
                    // Copia profunda del array de manos
                    const nuevasCartasMesa = prev.cartasMesa.map(mano => mano ? [...mano] : []);

                    // Asegurarse de que el array para la mano específica existe
                    if (!nuevasCartasMesa[manoNumero]) {
                        nuevasCartasMesa[manoNumero] = [];
                    }
                     const indiceEnMano = jugador.nombre === prev.equipoPrimero?.jugador.nombre ? 0 : 1; // 0 para Eq1, 1 para Eq2
                     // Asegura que hay placeholders null si es necesario
                     while (nuevasCartasMesa[manoNumero].length <= indiceEnMano) {
                         nuevasCartasMesa[manoNumero].push(null);
                     }
                     nuevasCartasMesa[manoNumero][indiceEnMano] = carta as CartaConInfoUI;

                    return { ...prev, cartasMesa: nuevasCartasMesa };
                 });
            },

            showPlayerCall: (jugador, mensaje) => {
                 console.log(`UI Callback: Canto de ${jugador?.nombre ?? 'Sistema'}: ${mensaje}`);
                 setGameState(prev => ({ ...prev, ultimoCanto: { jugador, mensaje } }));
                 // Ocultar el canto después de un tiempo
                 setTimeout(() => {
                     // Solo ocultar si el mensaje no ha cambiado mientras tanto
                     setGameState(prev => prev.ultimoCanto?.mensaje === mensaje ? { ...prev, ultimoCanto: null } : prev);
                 }, 4000); // Duración del mensaje de canto
            },
            actualizarAccionesPosibles: (acciones) => {
                 // console.log("UI Callback: Actualizando acciones", acciones); // Mucho log, opcional
                 setGameState(prev => ({ ...prev, accionesPosibles: acciones }));
            },

            iniciarNuevaRondaUI: () => {
                 console.log("UI Callback: Iniciando Nueva Ronda Visualmente");
                 setGameState(prev => ({
                     ...prev,
                     cartasMesa: [[], [], []],       // Limpia el tablero visual
                     mostrandoCartelReparto: true, // Muestra el cartel "Repartiendo..."
                     numeroManoActual: 0,          // Resetea visualmente a mano 1
                     ultimoCanto: null,            // Limpia el último canto mostrado
                     // cartasManoJugador se actualizará con displayPlayerCards
                 }));
                 // Ocultar el cartel después de un tiempo
                 setTimeout(() => {
                     setGameState(prev => ({ ...prev, mostrandoCartelReparto: false }));
                 }, 1500); // Duración del cartel
            },

             highlightWinningCard: (ganador, manoNumero, jugadaEnManoGanadora) => {
                 console.log(`UI Callback: Resaltar carta ganadora de ${ganador.nombre} en mano ${manoNumero + 1}`);
                 // Aquí iría la lógica para añadir un efecto visual, quizás actualizando
                 // un estado adicional o directamente manipulando estilos (menos recomendado en React)
             },
             displayRoundWinner: (winnerName) => {
                 console.log(`UI Callback: Mostrar ganador de la ronda ${winnerName}`);
                 // Podrías usar esto para mostrar un mensaje/banner temporal
             },
        }; // Fin de reactUIBridge

        // Crear instancia de Partida con los callbacks y modo debug
        return new Partida(reactUIBridge, true); // true para activar debug en Partida

    }, []); // El array vacío asegura que partida se crea solo una vez

    // --- Manejadores de Eventos de la UI ---

    const iniciarPartida = useCallback(() => {
        console.log("Iniciando Partida desde UI...");
        // Resetear estado visual principal ANTES de iniciar la lógica
        setGameState(prev => ({
             ...initialState, // Volver al estado inicial limpio
             partidaIniciada: true, // Marcar como iniciada para mostrar el tablero
             equipoPrimero: partida.equipoPrimero || null,
             equipoSegundo: partida.equipoSegundo || null,
        }));
        partida.iniciar("Humano", "IA", 30); // Nombres y límite de puntos
    }, [partida]); // Depende de la instancia de partida

    const handlePlayCard = useCallback((carta: Naipe) => {
        // Validaciones básicas en UI (Turno, estado, acción posible)
        const esTurnoJugadorHumano = gameState.turnoActual?.jugador.esHumano === true;
        if (
            !gameState.partidaTerminada &&
            esTurnoJugadorHumano &&
            gameState.accionesPosibles.puedeJugarCarta
        ) {
            console.log("UI Event: Jugando carta", carta);
            partida.handleHumanPlayCard(carta); // Delegar a la lógica de Partida
        } else {
            console.warn("Intento de jugar carta inválido", {partidaTerminada: gameState.partidaTerminada, esTurnoJugadorHumano, puedeJugarCarta: gameState.accionesPosibles.puedeJugarCarta})
        }
    }, [partida, gameState.partidaTerminada, gameState.turnoActual, gameState.accionesPosibles.puedeJugarCarta]); // Dependencias

    const handleCanto = useCallback((canto: Canto) => {
         // Validaciones básicas en UI
        const esTurnoJugadorHumano = gameState.turnoActual?.jugador.esHumano === true;
        if (!gameState.partidaTerminada && esTurnoJugadorHumano) {
            const acciones = gameState.accionesPosibles;
            // Verificar si el canto está en alguna de las listas de acciones posibles
            const esCantoValido = acciones.puedeCantarEnvido.includes(canto) ||
                                  acciones.puedeCantarTruco.includes(canto);
            const esRespuestaValida = acciones.puedeResponder.includes(canto);
            const esMazoValido = canto === Canto.IrAlMazo && acciones.puedeMazo;

            if (esCantoValido || esRespuestaValida || esMazoValido) {
                console.log("UI Event: Cantando/Respondiendo", canto);
                partida.handleHumanCanto(canto); // Delegar a la lógica de Partida
            } else {
                 console.warn(`Intento de canto/respuesta inválido: ${canto}`, acciones);
                 // Opcional: Mostrar mensaje al usuario
                 setGameState(prev => ({ ...prev, mensajeLog: [`No puedes ${canto} ahora.`, ...prev.mensajeLog] }));
            }
        } else {
             console.warn("Intento de canto inválido (fuera de turno o partida terminada)");
        }
    }, [partida, gameState.partidaTerminada, gameState.turnoActual, gameState.accionesPosibles]); // Dependencias

    // --- Renderizado del Componente ---
    return (
        // Clases Tailwind para layout principal
        <div className="flex h-screen bg-gradient-to-b from-green-700 to-green-900 text-white p-2 overflow-hidden relative font-sans">
            {/* Columna Izquierda: Log */}
            <div className="w-1/4 xl:w-1/5 pr-2 flex flex-col h-full">
                <div className="text-lg font-semibold mb-1 text-yellow-300 tracking-wide">Historial</div>
                <GameLog
                    mensajes={gameState.mensajeLog}
                    className="flex-1 bg-black bg-opacity-50 rounded-lg shadow-lg overflow-y-auto text-sm"
                 />
            </div>

            {/* Columna Derecha: Juego Principal */}
            <div className="w-3/4 xl:w-4/5 flex flex-col h-full overflow-y-auto pl-1">
                {/* Marcador */}
                <Scoreboard
                    equipoPrimero={gameState.equipoPrimero}
                    equipoSegundo={gameState.equipoSegundo}
                    limitePuntaje={partida.limitePuntaje} // Obtener de la instancia de partida
                    className="mb-2"
                />

                {/* Área Principal: Botón Iniciar o Tablero de Juego */}
                {!gameState.partidaIniciada ? (
                    // --- Pantalla de Inicio ---
                    <div className="flex-1 flex items-center justify-center">
                        <button
                            onClick={iniciarPartida}
                            className="bg-yellow-500 hover:bg-yellow-600 text-green-900 font-bold py-4 px-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 shadow-xl transform transition hover:scale-105 text-xl"
                        >
                            Iniciar Partida
                        </button>
                    </div>
                ) : (
                    // --- Tablero de Juego Activo ---
                    <div className="flex flex-col flex-1 max-h-full relative">
                        {/* Cartel "Repartiendo..." */}
                        {gameState.mostrandoCartelReparto && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm rounded-lg">
                                <div className="text-4xl font-bold text-yellow-300 animate-pulse p-6 rounded-lg shadow-xl border-2 border-yellow-500 bg-black bg-opacity-80">
                                    Repartiendo Cartas...
                                </div>
                            </div>
                        )}

                            <CallDisplay call={gameState.ultimoCanto} />

                        {/* Área del Oponente (IA) */}
                        <div className="mb-2">
                            <PlayerArea
                                jugador={gameState.equipoSegundo?.jugador ?? null}
                                cartas={Array(gameState.equipoSegundo?.jugador?.cartasEnMano?.length ?? gameState.cartasManoJugador.length ?? 3).fill(null)} // Muestra dorsos
                                esTurno={gameState.turnoActual === gameState.equipoSegundo}
                                onCardClick={() => {}} // No se puede hacer clic en cartas IA
                                puedeJugarCarta={false}
                                imageBasePath={IMAGE_BASE_PATH}
                            />
                        </div>

                        {/* Mesa de Juego */}
                        <div className="flex-1 mb-2 min-h-[20vh] md:min-h-[25vh]">
                            <GameBoard
                                // Pasar el estado actualizado que incluye CartaConInfoUI
                                cartasMesa={gameState.cartasMesa}
                                numeroManoActual={gameState.numeroManoActual}
                                imageBasePath={IMAGE_BASE_PATH}
                            />
                        </div>

                        {/* Área del Jugador Humano */}
                        <div className="mb-1">
                            <PlayerArea
                                jugador={gameState.equipoPrimero?.jugador ?? null}
                                cartas={gameState.cartasManoJugador} // Cartas reales del humano
                                esTurno={gameState.turnoActual?.jugador?.esHumano === true}
                                onCardClick={handlePlayCard} // Manejador para jugar carta
                                puedeJugarCarta={gameState.accionesPosibles.puedeJugarCarta}
                                imageBasePath={IMAGE_BASE_PATH}
                            />
                        </div>

                        {/* Botones de Acción */}
                        <div className="mt-auto pt-1 pb-1"> {/* Empuja los botones hacia abajo */}
                            <ActionButtons
                                acciones={gameState.accionesPosibles}
                                onCanto={handleCanto} // Manejador para cantar/responder
                                partidaTerminada={gameState.partidaTerminada}
                                className="w-full" // Ocupar ancho disponible
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;