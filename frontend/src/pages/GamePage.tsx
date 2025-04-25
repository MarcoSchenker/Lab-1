import React, { useState, useMemo, useCallback } from 'react'; // Quité useRef
import { useNavigate } from 'react-router-dom';
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
import StartGameScreen from '../components/StartGameScreen';
import EndGameScreen from '../components/GameOverScreen';

interface CartaConInfoUI extends Naipe { esHumano?: boolean;}

interface GameState {
    partidaTerminada: boolean;
    partidaIniciada: boolean;
    equipoPrimero: Equipo | null;
    equipoSegundo: Equipo | null;
    ganadorPartida: Equipo | null;
    cartasManoJugador: Naipe[];
    cartasMesa: (CartaConInfoUI | null)[][];
    turnoActual: Equipo | null;
    accionesPosibles: AccionesPosibles;
    mensajeLog: string[];
    ultimoCanto: { jugador: Jugador | null, mensaje: string } | null;
    numeroManoActual: number; // Mano 0, 1, 2
    mostrandoCartelReparto: boolean;
    estadoJuego: 'seleccionando_puntos' | 'jugando' | 'terminado'; // Nuevo estado para flujo
    limitePuntosSeleccionado: number | null; // Para guardar 15 o 30
    mostrandoConfirmacionSalir: boolean;
}
const initialState: GameState = {
    ganadorPartida: null,
    partidaTerminada: false,
    partidaIniciada: false,
    estadoJuego: 'seleccionando_puntos', // Empezamos en la selección
    limitePuntosSeleccionado: null,
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
    mostrandoConfirmacionSalir: false,
};

const IMAGE_BASE_PATH = '/cartas/mazoOriginal';
const GAME_BACKGROUND_IMAGE = '/tablebackground.png';
const GamePage: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const navigate = useNavigate();
    const partida = useMemo(() => {
        const reactUIBridge: GameCallbacks = {
            setPartidaTerminada: (ganador?: Equipo | null) => {
                console.log("UI Callback: Partida Terminada", ganador);
                setGameState(prev => ({
                    ...prev,
                    estadoJuego: 'terminado', // Cambia el estado del juego
                    ganadorPartida: partida.getGanadorPartida(),
                    accionesPosibles: initialState.accionesPosibles,
                    turnoActual: null,
                }));
            },
            setTurno: (equipo) => {
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
            displayLog: (message, type: LogType = 'public') => {
                if (type === 'debug' && !true) {
                     return;
                }
                 setGameState(prev => ({
                     ...prev,
                     mensajeLog: [`${message}`, ...prev.mensajeLog.slice(0, 99)],
                 }));
            },
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
                        cartasManoJugador: [...jugador.cartasEnMano],
                    }));
                }
                // Nota: Podrías querer actualizar el número de cartas de la IA aquí
                // para mostrar los dorsos correctamente, si PlayerArea lo soporta.
            },

            displayPlayedCard: (jugador, carta, manoNumero, jugadaEnMano) => {
                 console.log(`UI Callback: Carta jugada por ${jugador.nombre} en mano ${manoNumero + 1}`, carta);
                 setGameState(prev => {
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
        return new Partida(reactUIBridge, false); // true para activar debug en Partida

    }, []); // El array vacío asegura que partida se crea solo una vez

    // --- Manejadores de Eventos de la UI ---

    const handleStartGame = useCallback((puntosLimite: 15 | 30) => {
        console.log("Iniciando Partida desde UI...");
        // Resetear estado visual principal ANTES de iniciar la lógica
        setGameState(prev => ({
             ...initialState, // Volver al estado inicial limpio
             estadoJuego: 'jugando',
             partidaIniciada: true, // Marcar como iniciada para mostrar el tablero
             limitePuntosSeleccionado: puntosLimite,
             equipoPrimero: partida.equipoPrimero || null,
             equipoSegundo: partida.equipoSegundo || null,
        }));
        partida.iniciar("Humano", "IA", puntosLimite); // Nombres y límite de puntos
    }, [partida]);
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
    const handleExitGame = useCallback(() => {
        console.log("UI Event: Saliendo del juego...");
        navigate('/dashboard');
         setGameState(initialState); // Vuelve a la pantalla de selección de puntos
    }, [navigate]);

    // --- MANEJADORES PARA SALIR ---
    const handleRequestExit = useCallback(() => {
        setGameState(prev => ({ ...prev, mostrandoConfirmacionSalir: true }));
    }, []);

    const handleConfirmExit = useCallback(() => {
        console.log("Navegando a /dashboard");
        setGameState(prev => ({ ...prev, mostrandoConfirmacionSalir: false })); // Ocultar modal
        navigate('/dashboard'); // Realizar la navegación
    }, [navigate]);

    const handleCancelExit = useCallback(() => {
        setGameState(prev => ({ ...prev, mostrandoConfirmacionSalir: false })); // Simplemente ocultar modal
    }, []);

    // Determina qué pantalla mostrar
    const renderScreen = () => {
        switch (gameState.estadoJuego) {
            case 'seleccionando_puntos': // O 'seleccionando_puntos' si prefieres
                 // La pantalla de inicio/selección de puntos
                return <StartGameScreen onStartGame={handleStartGame} onExit={handleExitGame} />; // Pasa onExit
            case 'jugando':
                // El tablero de juego y elementos de UI de la partida
                return (
                     <div className="flex flex-col flex-1 max-h-full relative">
                         {/* ... Contenido del juego (Cartel Repartiendo, CallDisplay, PlayerAreas, GameBoard, ActionButtons) ... */}
                          {gameState.mostrandoCartelReparto && (
                             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm rounded-lg">
                                 <div className="text-4xl font-bold text-yellow-300 animate-pulse p-6 rounded-lg shadow-xl border-2 border-yellow-500 bg-black bg-opacity-80">
                                     Repartiendo Cartas...
                                 </div>
                             </div>
                          )}

                          {/* CallDisplay */}
                          <CallDisplay call={gameState.ultimoCanto} />

                          {/* Área del Oponente (IA) */}
                          <div className="mb-2">
                              <PlayerArea
                                  jugador={gameState.equipoSegundo?.jugador ?? null}
                                  cartas={Array(gameState.equipoSegundo?.jugador?.cartasEnMano?.length ?? 3).fill(null)}
                                  esTurno={gameState.turnoActual === gameState.equipoSegundo}
                                  onCardClick={() => {}}
                                  puedeJugarCarta={false}
                                  imageBasePath={IMAGE_BASE_PATH}
                              />
                          </div>

                          {/* Mesa de Juego */}
                          <div className="flex-1 mb-2 min-h-[20vh] md:min-h-[25vh]">
                              <GameBoard
                                  cartasMesa={gameState.cartasMesa}
                                  numeroManoActual={gameState.numeroManoActual}
                                  imageBasePath={IMAGE_BASE_PATH}
                              />
                          </div>

                          {/* Área del Jugador Humano */}
                          <div className="mb-1">
                              <PlayerArea
                                  jugador={gameState.equipoPrimero?.jugador ?? null}
                                  cartas={gameState.cartasManoJugador}
                                  esTurno={gameState.turnoActual?.jugador?.esHumano === true}
                                  onCardClick={handlePlayCard}
                                  puedeJugarCarta={gameState.accionesPosibles.puedeJugarCarta}
                                  imageBasePath={IMAGE_BASE_PATH}
                              />
                          </div>

                          {/* Botones de Acción */}
                          <div className="mt-auto pt-1 pb-1">
                              <ActionButtons
                                  acciones={gameState.accionesPosibles}
                                  onCanto={handleCanto}
                                  partidaTerminada={gameState.partidaTerminada}
                                  className="w-full"
                              />
                          </div>
                     </div>
                );
            case 'terminado':
                return (
                    <EndGameScreen
                        humanPlayerWon={gameState.ganadorPartida?.jugador?.esHumano === true}
                        onRematch={handleStartGame} // La revancha inicia una nueva partida
                        onExit={handleExitGame} // El salir vuelve a la pantalla de inicio/selección
                    />
                );
            default:
                // Podrías tener un estado de carga o un error
                return <div>Cargando...</div>;
        }
    };


    return (
        <div className="flex h-screen w-screen text-white p-2 overflow-hidden relative font-sans bg-marron-oscuro">
            <div className="w-1/4 xl:w-1/3 pr-2 flex flex-col h-full bg-stone-900 bg-opacity-80 rounded-lg p-4 relative pt-60">

            <button
                onClick={handleRequestExit}
                className="absolute top-2 left-2 px-4 py-3 text-yellow-300 hover:text-yellow-500 transition-colors z-10 text-base rounded flex items-center gap-2 bg-mesa-oscura hover:bg-marron-oscuro/80 border-2 border-yellow-500 shadow-md transform hover:scale-105"
                aria-label="Abandonar Partida"
                title="Abandonar Partida"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Abandonar Partida
            </button>

            <div className="flex flex-col flex-grow justify-content justify-normal items-center">
                <Scoreboard
                    equipoPrimero={gameState.equipoPrimero}
                    equipoSegundo={gameState.equipoSegundo}
                    limitePuntaje={partida.limitePuntaje}
                    className="mb-2 text-white"
                />
                    <div className="flex items-center my-4 w-2/3 mx-auto">
                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-yellow-500 to-yellow-500"></div>
                    <div className="text-3xl text-yellow-500 mx-2">⚜️</div>
                    <div className="flex-grow h-px bg-gradient-to-l from-transparent via-yellow-500 to-yellow-500"></div>
                    </div>
                <div className="text-lg font-semibold mb-1 text-yellow-300 tracking-wide">Historial de partida</div>
                <GameLog
                    mensajes={gameState.mensajeLog}
                />
            </div>
            </div>
            {/* Columna Derecha: Contenido de la Pantalla Actual (Inicio, Jugando, Terminado) */}
            <div
                className="w-3/4 xl:w-4/5 flex flex-col h-full pl-1 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${GAME_BACKGROUND_IMAGE}')` }}
            >
                {/* Renderiza la pantalla actual según el estado */}
                {renderScreen()}

                 {/* Modal de Confirmación de Salida (Condicional) */}
                 {gameState.mostrandoConfirmacionSalir && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
                        <div className="bg-stone-800 bg-opacity-95 p-8 rounded-lg shadow-xl border-2 border-yellow-600 w-full max-w-sm mx-auto text-center">

                            {/* Título del Modal */}
                             <h3 className="text-xl font-semibold text-yellow-300 mb-4">
                                 Abandonar Partida
                             </h3>

                            {/* Mensaje del Modal */}
                            <p className="text-gray-200 mb-6">
                                ¿Estás seguro que quieres abandonar la partida?
                            </p>

                            {/* Botones del Modal */}
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handleConfirmExit} // Llama a la función para salir
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105"
                                >
                                    Sí, Salir
                                </button>
                                <button
                                    onClick={handleCancelExit} // Llama a la función para cancelar
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 shadow-md transform transition hover:scale-105"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;