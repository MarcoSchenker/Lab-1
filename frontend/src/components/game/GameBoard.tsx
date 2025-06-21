import React from 'react';
import GameCard from './GameCard';

interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

interface Jugador {
  id: number;
  nombreUsuario: string;
  equipoId: number;
  esPie: boolean;
  cartasMano: Carta[] | null;
  cartasJugadasRonda: Carta[];
  estadoConexion: string;
  skinPreferida?: string;
}

interface CartaEnMesa {
  jugadorId: number;
  carta: Carta;
}

interface ManoJugada {
  numeroMano: number;
  jugadas: Array<{
    jugadorId: number;
    carta: Carta;
    equipoId?: number;
    ordenJugada?: number;
  }>;
  ganadorManoEquipoId: number | null;
  ganadorManoJugadorId: number | null;
  fueParda: boolean;
  jugadorQueInicioManoId: number | null;
}

interface GameBoardProps {
  jugadores: Jugador[];
  jugadorActualId: number | null;
  jugadorEnTurnoId?: number | null;
  cartasEnMesa?: CartaEnMesa[];
  manosJugadas?: ManoJugada[];
  jugadorSkins?: Record<number, string>;
  ganadorRonda?: number | null;
  manoActual?: number;
  // ✅ NUEVO: Orden lógico de jugadores del backend
  ordenJugadoresRonda?: Array<{
    id: number;
    nombreUsuario: string;
    equipoId: number;
  }>;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  jugadores, 
  jugadorActualId,
  jugadorEnTurnoId, 
  cartasEnMesa = [],
  manosJugadas = [],
  jugadorSkins = {},
  ganadorRonda = null,
  manoActual = 0,
  ordenJugadoresRonda = []
}) => {
  // Log mano actual para debug si es necesario
  console.log(`GameBoard - Mano actual: ${manoActual + 1}`);

  const obtenerNombreJugador = (jugadorId: number): string => {
    const jugador = jugadores.find(j => j.id === jugadorId);
    return jugador ? jugador.nombreUsuario : 'Desconocido';
  };

  const renderCartasEnMesa = () => {
    // Agrupar cartas por jugador con solapamiento
    const cartasPorJugador: Record<number, Carta[]> = {};
    
    // Cartas de manos anteriores
    manosJugadas.forEach((mano) => {
      if (!mano.numeroMano || !mano.jugadas) return;
      mano.jugadas.forEach((jugada) => {
        if (!cartasPorJugador[jugada.jugadorId]) cartasPorJugador[jugada.jugadorId] = [];
        cartasPorJugador[jugada.jugadorId].push(jugada.carta);
      });
    });
    
    // Cartas de la mano actual
    const manoActualNumero = manoActual + 1;
    const existeManoActualEnHistorial = manosJugadas.some(m => m.numeroMano === manoActualNumero);
    
    if (!existeManoActualEnHistorial) {
      cartasEnMesa.forEach((cartaJugada) => {
        if (!cartasPorJugador[cartaJugada.jugadorId]) cartasPorJugador[cartaJugada.jugadorId] = [];
        cartasPorJugador[cartaJugada.jugadorId].push(cartaJugada.carta);
      });
    }

    const hayCartas = Object.keys(cartasPorJugador).length > 0;

    return (
      <div className="mesa-juego-mejorada">
        {/* Superficie de la mesa */}
        <div className="superficie-mesa">
          {!hayCartas ? (
            <div className="mesa-vacia-estado">
              <div className="mesa-pattern"></div>
              <div className="mesa-vacia-content">
                <div className="icono-cartas">🂠</div>
                <p>Esperando cartas...</p>
              </div>
            </div>
          ) : (
            <div className="cartas-posicionadas-container">
              {/* Cartas posicionadas según la perspectiva */}
              {Object.entries(cartasPorJugador).map(([jugadorIdStr, cartas]) => {
                const jugadorId = parseInt(jugadorIdStr);
                const jugador = jugadores.find(j => j.id === jugadorId);
                const jugadorActualRef = jugadores.find(j => j.id === jugadorActualId);
                const skinName = jugadorSkins[jugadorId] || 'Original';
                const isCurrentPlayer = jugadorId === jugadorActualId;
                
                if (!jugador || !jugadorActualRef) return null;
                
                // Determinar posición: calcular según la distribución 2x2
                let positionClass = '';
                
                if (jugadores.length === 4) {
                  // 2v2: Usar el orden lógico del BACKEND, no rotar por jugador actual
                  // Todos los jugadores deben ver la misma distribución lógica
                  
                  // Usar el orden del backend si está disponible, sino fallback al orden por ID
                  let jugadoresEnOrdenLogico: Jugador[];
                  
                  if (ordenJugadoresRonda && ordenJugadoresRonda.length === 4) {
                    // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
                    jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
                      jugadores.find(j => j.id === orden.id)
                    ).filter(Boolean) as Jugador[];
                    
                    console.log('🎯 Usando orden del backend para cartas:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  } else {
                    // Fallback: orden por ID (determinista)
                    jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
                    console.log('⚠️ Fallback: usando orden por ID para cartas:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  }
                  
                  // DISTRIBUCIÓN FIJA DE TRUCO TRADICIONAL (misma para todos los jugadores):
                  // Posición [0] = BOTTOM-LEFT (mano)
                  // Posición [1] = BOTTOM-RIGHT (derecha de mano) 
                  // Posición [2] = TOP-RIGHT (compañero de mano)
                  // Posición [3] = TOP-LEFT (izquierda de mano)
                  
                  const bottomLeft = jugadoresEnOrdenLogico[0];  // Mano
                  const bottomRight = jugadoresEnOrdenLogico[1]; // Derecha de mano
                  const topRight = jugadoresEnOrdenLogico[2];    // Compañero de mano
                  const topLeft = jugadoresEnOrdenLogico[3];     // Izquierda de mano
                  
                  // Determinar posición de este jugador específico
                  let posicionFinal = 'posicion-bottom-left'; // default
                  
                  if (jugadorId === topLeft.id) {
                    posicionFinal = 'posicion-top-left';
                  } else if (jugadorId === topRight.id) {
                    posicionFinal = 'posicion-top-right';
                  } else if (jugadorId === bottomLeft.id) {
                    posicionFinal = 'posicion-bottom-left';
                  } else if (jugadorId === bottomRight.id) {
                    posicionFinal = 'posicion-bottom-right';
                  }
                  
                  positionClass = `${isCurrentPlayer ? 'jugador-actual-cartas' : 'oponente-cartas'} ${posicionFinal}`;
                } else if (jugadores.length === 6) {
                  // 3v3: Distribución alternada más compleja
                  const compañeros = jugadores.filter(j => j.id !== jugadorActualId && j.equipoId === jugadorActualRef.equipoId);
                  const oponentes = jugadores.filter(j => j.id !== jugadorActualId && j.equipoId !== jugadorActualRef.equipoId);
                  
                  const esCompañero = jugador.equipoId === jugadorActualRef.equipoId;
                  
                  if (isCurrentPlayer) {
                    positionClass = 'jugador-actual-cartas';
                  } else if (esCompañero) {
                    const compañeroIndex = compañeros.findIndex(comp => comp.id === jugadorId);
                    positionClass = `oponente-cartas compañero-3v3-${compañeroIndex + 1}`;
                  } else {
                    const oponenteIndex = oponentes.findIndex(op => op.id === jugadorId);
                    positionClass = `oponente-cartas oponente-3v3-${oponenteIndex + 1}`;
                  }
                } else {
                  positionClass = isCurrentPlayer ? 'jugador-actual-cartas' : 'oponente-cartas';
                }
                
                return (
                  <div 
                    key={`cartas-${jugadorId}`} 
                    className={`cartas-jugador-posicionadas ${positionClass}`}
                  >
                    <div className="jugador-label-cartas">
                      {jugador?.nombreUsuario || 'Jugador'}
                    </div>
                    <div className="cartas-solapadas">
                      {cartas.map((carta, index) => (
                        <div
                          key={`${carta.idUnico}-${index}`}
                          className="carta-solapada"
                          style={{
                            zIndex: index + 1,
                            marginLeft: index > 0 ? '-50px' : '0px',
                          }}
                        >
                          <GameCard
                            carta={carta}
                            skinName={skinName}
                            size="medium"
                            className="carta-en-mesa shadow-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Información de la mesa */}
        <div className="mesa-info">
          <div className="mano-actual">Mano {manoActual + 1}</div>
          {ganadorRonda && (
            <div className="ganador-info">
              🏆 {obtenerNombreJugador(ganadorRonda)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderiza los avatares con perspectiva (jugador actual abajo) y distribución alternada por equipos
  const renderJugadoresConPerspectiva = () => {
    const numJugadores = jugadores.length;
    
    // Organizar jugadores con perspectiva
    const jugadorActual = jugadores.find(j => j.id === jugadorActualId);
    const otrosJugadores = jugadores.filter(j => j.id !== jugadorActualId);
    
    if (!jugadorActual) {
      console.error('No se encontró el jugador actual');
      return null;
    }
    
    // Función para renderizar un avatar horizontal
    const renderAvatarHorizontal = (jugador: Jugador, position: 'top' | 'bottom') => {
      const isCurrentPlayer = jugador.id === jugadorActualId;
      const isOnTurn = jugador.id === jugadorEnTurnoId;
      const isTeammate = !isCurrentPlayer && jugador.equipoId === jugadorActual.equipoId;
      const isOpponent = !isCurrentPlayer && jugador.equipoId !== jugadorActual.equipoId;
      
      return (
        <div 
          key={jugador.id}
          className={`avatar-horizontal ${position} ${isCurrentPlayer ? 'current-player' : isOpponent ? 'opponent-player' : 'teammate-player'} ${isOnTurn ? 'on-turn' : ''} ${isCurrentPlayer ? 'jugador-actual-avatar' : ''}`}
        >
          <div className="avatar-content">
            <div className={`avatar-image-horizontal team-${jugador.equipoId}`}>
              {jugador.nombreUsuario.substring(0, 2).toUpperCase()}
            </div>
            <div className="avatar-info">
              <div className="player-name-horizontal">{jugador.nombreUsuario}</div>
              <div className="player-status">
                <span className={`connection-dot ${jugador.estadoConexion}`}></span>
                <span className="status-text">{jugador.estadoConexion === 'conectado' ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <div className="cards-count">
                {jugador.cartasMano ? jugador.cartasMano.filter(c => !c.estaJugada).length : 0} cartas
              </div>
              {isTeammate && (
                <div className="teammate-indicator">
                  <span>🤝 Compañero</span>
                </div>
              )}
            </div>
            {isOnTurn && (
              <div className="turn-indicator-horizontal">
                <span className="turn-pulse">⚡</span>
                <span>Su turno</span>
              </div>
            )}
            {isCurrentPlayer && (jugadores.length === 4 || jugadores.length === 6) && (
              <div className="you-indicator">
                <span className="you-pulse">🎯</span>
                <span>TÚ</span>
              </div>
            )}
          </div>
        </div>
      );
    };

    if (numJugadores === 2) {
      // 1v1: Jugador actual abajo, oponente arriba
      return (
        <div className="jugadores-perspectiva">
          <div className="jugadores-top">
            {otrosJugadores.map(jugador => renderAvatarHorizontal(jugador, 'top'))}
          </div>
          <div className="jugadores-bottom">
            {renderAvatarHorizontal(jugadorActual, 'bottom')}
          </div>
        </div>
      );
    } else if (numJugadores === 4) {
      // 2v2: DISTRIBUCIÓN FIJA BASADA EN EL ORDEN LÓGICO DEL BACKEND
      // Todos los jugadores ven la misma distribución lógica (no rotada)
      
      // Usar el orden del backend si está disponible, sino fallback al orden por ID  
      let jugadoresEnOrdenLogico: Jugador[];
      
      if (ordenJugadoresRonda && ordenJugadoresRonda.length === 4) {
        // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
        jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
          jugadores.find(j => j.id === orden.id)
        ).filter(Boolean) as Jugador[];
        
        console.log('🎯 Usando orden del backend para avatares:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id}, Equipo:${j.equipoId})`));
      } else {  
        // Fallback: orden por ID (determinista)
        jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
        console.log('⚠️ Fallback: usando orden por ID para avatares:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id}, Equipo:${j.equipoId})`));
      }
      
      // DISTRIBUCIÓN FIJA DE TRUCO TRADICIONAL (misma para todos los jugadores):
      // Posición [0] = BOTTOM-LEFT (mano) 
      // Posición [1] = BOTTOM-RIGHT (derecha de mano)
      // Posición [2] = TOP-RIGHT (compañero de mano)
      // Posición [3] = TOP-LEFT (izquierda de mano)
      
      const bottomLeft = jugadoresEnOrdenLogico[0];  // Mano
      const bottomRight = jugadoresEnOrdenLogico[1]; // Derecha de mano  
      const topRight = jugadoresEnOrdenLogico[2];    // Compañero de mano
      const topLeft = jugadoresEnOrdenLogico[3];     // Izquierda de mano
      
      // Debug: mostrar distribución lógica fija
      console.log('=== DISTRIBUCIÓN 2x2 LÓGICA FIJA ===');
      console.log('TOP-LEFT (pos 3):', topLeft.nombreUsuario, 'ID:', topLeft.id, 'Equipo:', topLeft.equipoId);
      console.log('TOP-RIGHT (pos 2):', topRight.nombreUsuario, 'ID:', topRight.id, 'Equipo:', topRight.equipoId);
      console.log('BOTTOM-LEFT (pos 0):', bottomLeft.nombreUsuario, 'ID:', bottomLeft.id, 'Equipo:', bottomLeft.equipoId);
      console.log('BOTTOM-RIGHT (pos 1):', bottomRight.nombreUsuario, 'ID:', bottomRight.id, 'Equipo:', bottomRight.equipoId);
      console.log('Compañeros están en diagonal:', 
        (bottomLeft.equipoId === topRight.equipoId) && (topLeft.equipoId === bottomRight.equipoId)
      );
      console.log('Jugador actual es:', jugadorActual.nombreUsuario, 'ID:', jugadorActual.id);
      
      interface JugadorConPosicion {
        jugador: Jugador;
        fila: string;
        columna: string;
      }
      
      const jugadoresConPosicion: JugadorConPosicion[] = [
        { jugador: topLeft, fila: 'top', columna: 'left' },
        { jugador: topRight, fila: 'top', columna: 'right' },
        { jugador: bottomLeft, fila: 'bottom', columna: 'left' },
        { jugador: bottomRight, fila: 'bottom', columna: 'right' }
      ];
      
      // Separar en filas
      const jugadoresTop = jugadoresConPosicion.filter(jp => jp.fila === 'top');
      const jugadoresBottom = jugadoresConPosicion.filter(jp => jp.fila === 'bottom');
      
      // Ordenar por columna (left primero, luego right)
      jugadoresTop.sort((a, _b) => a.columna === 'left' ? -1 : 1);
      jugadoresBottom.sort((a, _b) => a.columna === 'left' ? -1 : 1);
      
      return (
        <div className="jugadores-perspectiva cuatro-jugadores-2x2">
          {/* Fila superior */}
          <div className="jugadores-top cuatro-jugadores-2x2">
            <div className="posicion-top-left">
              {jugadoresTop.find(jp => jp.columna === 'left') && 
               renderAvatarHorizontal(jugadoresTop.find(jp => jp.columna === 'left')!.jugador, 'top')}
            </div>
            <div className="posicion-top-right">
              {jugadoresTop.find(jp => jp.columna === 'right') && 
               renderAvatarHorizontal(jugadoresTop.find(jp => jp.columna === 'right')!.jugador, 'top')}
            </div>
          </div>
          
          {/* Fila inferior */}
          <div className="jugadores-bottom cuatro-jugadores-2x2">
            <div className="posicion-bottom-left">
              {jugadoresBottom.find(jp => jp.columna === 'left') && 
               renderAvatarHorizontal(jugadoresBottom.find(jp => jp.columna === 'left')!.jugador, 'bottom')}
            </div>
            <div className="posicion-bottom-right">
              {jugadoresBottom.find(jp => jp.columna === 'right') && 
               renderAvatarHorizontal(jugadoresBottom.find(jp => jp.columna === 'right')!.jugador, 'bottom')}
            </div>
          </div>
        </div>
      );
    } else if (numJugadores === 6) {
      // 3v3: Distribución alternada por equipos
      // Separar compañeros de oponentes
      const compañeros = otrosJugadores.filter(j => j.equipoId === jugadorActual.equipoId);
      const oponentes = otrosJugadores.filter(j => j.equipoId !== jugadorActual.equipoId);
      
      // Distribución típica de 3v3 en truco:
      // Arriba: alternar equipos (ej: oponente, compañero, oponente)
      // Abajo: alternar equipos (ej: compañero, oponente, JUGADOR ACTUAL)
      const jugadoresTop: Jugador[] = [];
      const jugadoresBottom: Jugador[] = [];
      
      // Arriba: 3 jugadores alternando equipos
      if (oponentes.length > 0) jugadoresTop.push(oponentes[0]);
      if (compañeros.length > 0) jugadoresTop.push(compañeros[0]);
      if (oponentes.length > 1) jugadoresTop.push(oponentes[1]);
      
      // Abajo: los jugadores restantes + jugador actual
      if (compañeros.length > 1) jugadoresBottom.push(compañeros[1]);
      if (oponentes.length > 2) jugadoresBottom.push(oponentes[2]);
      
      return (
        <div className="jugadores-perspectiva seis-jugadores">
          <div className="jugadores-top seis-jugadores">
            {jugadoresTop.map(jugador => renderAvatarHorizontal(jugador, 'top'))}
          </div>
          <div className="jugadores-bottom seis-jugadores">
            {jugadoresBottom.map(jugador => renderAvatarHorizontal(jugador, 'bottom'))}
            {renderAvatarHorizontal(jugadorActual, 'bottom')}
          </div>
        </div>
      );
    } else {
      // Fallback para otros números de jugadores
      return (
        <div className="jugadores-perspectiva">
          <div className="jugadores-top">
            {otrosJugadores.slice(0, Math.ceil(otrosJugadores.length / 2)).map(jugador => 
              renderAvatarHorizontal(jugador, 'top')
            )}
          </div>
          <div className="jugadores-bottom">
            {otrosJugadores.slice(Math.ceil(otrosJugadores.length / 2)).map(jugador => 
              renderAvatarHorizontal(jugador, 'bottom')
            )}
            {renderAvatarHorizontal(jugadorActual, 'bottom')}
          </div>
        </div>
      );
    }
  };

  // Mesa central más alta y con mejor diseño
  return (
    <div className="game-board-mejorado">
      {/* Jugadores posicionados con perspectiva */}
      {renderJugadoresConPerspectiva()}
      
      {/* Mesa central más alta */}
      <div className="mesa-container">
        {renderCartasEnMesa()}
      </div>
    </div>
  );
};

export default GameBoard;
