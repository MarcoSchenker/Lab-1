// GamePage.tsx refactor para mantener las cartas jugadas por mano 
import React, { useState, useMemo, useCallback } from 'react';
import { Partida } from '../game/iaPro/partida';
import { Jugador } from '../game/iaPro/jugador';
import { Naipe } from '../game/iaPro/naipe';
import { Canto, AccionesPosibles, Equipo } from '../game/iaPro/types';
import { GameCallbacks } from '../game/game-callbacks';
import PlayerArea from '../components/PlayerArea';
import GameBoard from '../components/GameBoard';
import Scoreboard from '../components/ScoreBoard';
import ActionButtons from '../components/ActionButtons';
import GameLog from '../components/GameLog';

interface GameState {
    partidaTerminada: boolean;
    partidaIniciada: boolean;
    equipoPrimero: Equipo | null;
    equipoSegundo: Equipo | null;
    cartasManoJugador: Naipe[];
    cartasMesa: (Naipe | null)[][];
    turnoActual: Equipo | null;
    accionesPosibles: AccionesPosibles;
    mensajeLog: string[];
    ultimoCanto: { jugador: Jugador | null, mensaje: string } | null;
    numeroManoActual: number;
}

const initialState: GameState = {
    partidaTerminada: false,
    partidaIniciada: false,
    equipoPrimero: null,
    equipoSegundo: null,
    cartasManoJugador: [],
    cartasMesa: [[], [], []],
    turnoActual: null,
    accionesPosibles: {
        puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false,
    },
    mensajeLog: [],
    ultimoCanto: null,
    numeroManoActual: 0,
};

const IMAGE_BASE_PATH = 'cartas/mazoOriginal';

const GamePage: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(initialState);

    const partida = useMemo(() => {
        const reactUIBridge: GameCallbacks = {
            setPartidaTerminada: () => setGameState(prev => ({ ...prev, partidaTerminada: true })),
            setTurno: (equipo) => setGameState(prev => ({ ...prev, turnoActual: equipo })),
            setNumeroMano: (mano) => setGameState(prev => ({ ...prev, numeroManoActual: mano })),
            clearLog: () => setGameState(prev => ({ ...prev, mensajeLog: [] })),
            displayLog: (message) => setGameState(prev => ({
                ...prev,
                mensajeLog: [message, ...prev.mensajeLog.slice(0, 99)],
            })),
            updateScores: (score1, score2) => setGameState(prev => ({
                ...prev,
                equipoPrimero: prev.equipoPrimero ? { ...prev.equipoPrimero, puntos: score1 } : null,
                equipoSegundo: prev.equipoSegundo ? { ...prev.equipoSegundo, puntos: score2 } : null,
            })),
            updatePlayerNames: (name1, name2) => {},
            displayPlayerCards: (jugador) => {
                if (jugador.esHumano) {
                    setGameState(prev => ({
                        ...prev,
                        cartasManoJugador: [...jugador.cartasEnMano],
                    }));
                }
            },
            clearPlayedCards: () => {
                setGameState(prev => ({ ...prev, cartasMesa: [[], [], []] }));
            },
            displayPlayedCard: (jugador, carta, manoNumero, jugadaEnMano) => {
                setGameState(prev => {
                    const nuevasCartasMesa = [...prev.cartasMesa];
                    const nuevaMano = [...(nuevasCartasMesa[manoNumero] || [])];
                    nuevaMano.push(carta);
                    nuevasCartasMesa[manoNumero] = nuevaMano;
                    return { ...prev, cartasMesa: nuevasCartasMesa };
                });
            },
            showPlayerCall: (jugador, mensaje) => {
                setGameState(prev => ({ ...prev, ultimoCanto: { jugador, mensaje } }));
                setTimeout(() => {
                    setGameState(prev => prev.ultimoCanto?.mensaje === mensaje ? { ...prev, ultimoCanto: null } : prev);
                }, 2500);
            },
            actualizarAccionesPosibles: (acciones) => setGameState(prev => ({ ...prev, accionesPosibles: acciones })),
        };

        return new Partida(reactUIBridge, true);
    }, []);

    const iniciarPartida = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            equipoPrimero: partida.equipoPrimero,
            equipoSegundo: partida.equipoSegundo,
        }));
        partida.iniciar("Username", "IA", 30);
        setGameState(prev => ({ ...prev, partidaIniciada: true }));
    }, [partida]);

    const handlePlayCard = useCallback((carta: Naipe) => {
        const esTurnoJugadorHumano = gameState.turnoActual?.jugador.esHumano === true;
        if (
            gameState.partidaIniciada &&
            !gameState.partidaTerminada &&
            esTurnoJugadorHumano &&
            gameState.accionesPosibles.puedeJugarCarta
        ) {
            partida.handleHumanPlayCard(carta);
        }
    }, [partida, gameState]);

    const handleCanto = useCallback((canto: Canto) => {
        const esTurnoJugadorHumano = gameState.turnoActual?.jugador.esHumano === true;

        if (
            gameState.partidaIniciada &&
            !gameState.partidaTerminada &&
            esTurnoJugadorHumano
        ) {
            const acciones = gameState.accionesPosibles;
            const esCantoValido = acciones.puedeCantarEnvido.includes(canto) || acciones.puedeCantarTruco.includes(canto);
            const esRespuestaValida = acciones.puedeResponder.includes(canto);
            const esMazoValido = canto === Canto.IrAlMazo && acciones.puedeMazo;

            if (esCantoValido || esRespuestaValida || esMazoValido) {
                partida.handleHumanCanto(canto);
            }
        }
    }, [partida, gameState]);

    return (
        <div className="flex h-screen bg-gradient-to-b from-green-800 to-green-900 text-white p-2 overflow-hidden">
            <div className="w-1/3 pr-2 flex flex-col h-full">
                <div className="text-lg font-bold mb-1 text-yellow-300">Historial del juego</div>
                <GameLog mensajes={gameState.mensajeLog} className="flex-1 bg-black bg-opacity-40 rounded-lg shadow-md overflow-y-auto" />
            </div>
            <div className="w-2/3 flex flex-col h-full overflow-y-auto">
                <Scoreboard
                    equipoPrimero={gameState.equipoPrimero}
                    equipoSegundo={gameState.equipoSegundo}
                    limitePuntaje={partida.limitePuntaje}
                    className="mb-2"
                />
                {!gameState.partidaIniciada ? (
                    <div className="flex-1 flex items-center justify-center">
                        <button 
                            onClick={iniciarPartida} 
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 shadow-lg transform transition hover:scale-105"
                        >
                            Iniciar Partida de Truco
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 max-h-full">
                        <div className="flex-1 bg-green-700 bg-opacity-80 rounded-xl shadow-xl border-2 border-yellow-800 border-opacity-60 backdrop-blur-sm p-3 mb-2">
                            <div className="flex flex-col h-full">
                                <div className="mb-2">
                                    <PlayerArea
                                        jugador={gameState.equipoSegundo?.jugador ?? null}
                                        cartas={Array(gameState.equipoSegundo?.jugador?.cartasEnMano?.length ?? 3).fill(null)}
                                        esTurno={gameState.turnoActual?.jugador.nombre === gameState.equipoSegundo?.jugador.nombre}
                                        ultimoCanto={gameState.ultimoCanto && gameState.ultimoCanto.jugador === gameState.equipoSegundo?.jugador ? gameState.ultimoCanto.mensaje : null}
                                        onCardClick={() => {}}
                                        puedeJugarCarta={false}
                                        imageBasePath={IMAGE_BASE_PATH}
                                    />
                                </div>
                                <div className="flex-1 mb-2">
                                    <GameBoard
                                        cartasMesa={gameState.cartasMesa}
                                        numeroManoActual={gameState.numeroManoActual}
                                        imageBasePath={IMAGE_BASE_PATH}
                                    />
                                </div>
                                <div className="mb-1">
                                    <PlayerArea
                                        jugador={gameState.equipoPrimero?.jugador ?? null}
                                        cartas={gameState.cartasManoJugador}
                                        esTurno={gameState.turnoActual?.jugador.nombre === gameState.equipoPrimero?.jugador.nombre}
                                        ultimoCanto={gameState.ultimoCanto && gameState.ultimoCanto.jugador === gameState.equipoPrimero?.jugador ? gameState.ultimoCanto.mensaje : null}
                                        onCardClick={handlePlayCard}
                                        puedeJugarCarta={gameState.accionesPosibles.puedeJugarCarta}
                                        imageBasePath={IMAGE_BASE_PATH}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mb-2">
                            <ActionButtons
                                acciones={gameState.accionesPosibles}
                                onCanto={handleCanto}
                                partidaTerminada={gameState.partidaTerminada}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;
