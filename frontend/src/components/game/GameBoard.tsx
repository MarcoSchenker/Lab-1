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
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  jugadores, 
  jugadorActualId,
  jugadorEnTurnoId, 
  cartasEnMesa = [],
  manosJugadas = [],
  jugadorSkins = {},
  ganadorRonda = null,
  manoActual = 0
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
                  // 2v2: Posicionamiento fijo según la distribución actual
                  const jugadoresOrdenados = [...jugadores].sort((a, b) => a.id - b.id);
                  const posicionJugadorActual = jugadoresOrdenados.findIndex(j => j.id === jugadorActualId);
                  const posicionEsteJugador = jugadoresOrdenados.findIndex(j => j.id === jugadorId);
                  
                  // Posiciones fijas originales (sin rotación)
                  const posicionesFijas = [
                    'posicion-top-left',     // J1A (posición 0)
                    'posicion-bottom-left',  // J2B (posición 1)
                    'posicion-bottom-right', // J3A (posición 2)
                    'posicion-top-right'     // J4B (posición 3)
                  ];
                  
                  // Aplicar rotación solo si es necesario (jugadores de arriba)
                  const necesitaRotacion = posicionJugadorActual === 0 || posicionJugadorActual === 3; // J1A o J4B
                  
                  let posicionFinal = posicionesFijas[posicionEsteJugador];
                  
                  if (necesitaRotacion) {
                    // Rotar 180° las posiciones
                    const rotacionMap: { [key: string]: string } = {
                      'posicion-top-left': 'posicion-bottom-right',
                      'posicion-top-right': 'posicion-bottom-left',
                      'posicion-bottom-left': 'posicion-top-right',
                      'posicion-bottom-right': 'posicion-top-left'
                    };
                    posicionFinal = rotacionMap[posicionFinal] || posicionFinal;
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
      // 2v2: Distribución fija 2x2 con perspectiva correcta
      // Mesa original (vista de J2B y J3A que están abajo):
      // J1A    J4B  ← Arriba
      // J2B    J3A  ← Abajo
      
      const jugadoresOrdenados = [...jugadores].sort((a, b) => a.id - b.id);
      
      // Asignar posiciones fijas basadas en el ID original
      const posicionesFijas = [
        { fila: 'top', columna: 'left' },     // J1A (arriba-izquierda)
        { fila: 'bottom', columna: 'left' },  // J2B (abajo-izquierda)  
        { fila: 'bottom', columna: 'right' }, // J3A (abajo-derecha)
        { fila: 'top', columna: 'right' }     // J4B (arriba-derecha)
      ];
      
      // Encontrar la posición del jugador actual
      const posicionJugadorActual = jugadoresOrdenados.findIndex(j => j.id === jugadorActual.id);
      
      // Crear mapeo con perspectiva correcta
      interface JugadorConPosicion {
        jugador: Jugador;
        fila: string;
        columna: string;
      }
      
      const jugadoresConPosicion: JugadorConPosicion[] = [];
      
      // Si el jugador actual está en la fila inferior (J2B o J3A), NO rotar (vista original)
      // Si el jugador actual está en la fila superior (J1A o J4B), rotar la vista 180°
      const necesitaRotacion = posicionJugadorActual === 0 || posicionJugadorActual === 3; // J1A o J4B
      
      for (let i = 0; i < 4; i++) {
        const jugador = jugadoresOrdenados[i];
        let posicion = posicionesFijas[i];
        
        if (necesitaRotacion) {
          // Rotar 180° para que J1A y J4B vean la mesa desde su perspectiva
          posicion = {
            fila: posicion.fila === 'top' ? 'bottom' : 'top',
            columna: posicion.columna === 'left' ? 'right' : 'left'
          };
        }
        
        jugadoresConPosicion.push({
          jugador,
          fila: posicion.fila,
          columna: posicion.columna
        });
      }
      
      // Separar en filas
      const jugadoresTop = jugadoresConPosicion.filter(jp => jp.fila === 'top');
      const jugadoresBottom = jugadoresConPosicion.filter(jp => jp.fila === 'bottom');
      
      // Debug: mostrar distribución
      console.log('=== DISTRIBUCIÓN 2x2 ===');
      console.log('Jugador actual:', jugadorActual.nombreUsuario, 'ID:', jugadorActual.id, 'Posición:', posicionJugadorActual);
      console.log('Necesita rotación:', necesitaRotacion);
      console.log('Jugadores TOP:', jugadoresTop.map(jp => `${jp.jugador.nombreUsuario} (${jp.columna})`));
      console.log('Jugadores BOTTOM:', jugadoresBottom.map(jp => `${jp.jugador.nombreUsuario} (${jp.columna})`));
      
      // Ordenar por columna (left primero, luego right)
      jugadoresTop.sort((a, _b) => a.columna === 'left' ? -1 : 1);
      jugadoresBottom.sort((a, _b) => a.columna === 'left' ? -1 : 1);
      
      return (
        <div className="jugadores-perspectiva cuatro-jugadores-2x2">
          {/* Fila superior */}
          <div className="jugadores-top cuatro-jugadores-2x2">
            <div className="posicion-top-left">
              {jugadoresTop[0] && renderAvatarHorizontal(jugadoresTop[0].jugador, 'top')}
            </div>
            <div className="posicion-top-right">
              {jugadoresTop[1] && renderAvatarHorizontal(jugadoresTop[1].jugador, 'top')}
            </div>
          </div>
          
          {/* Fila inferior */}
          <div className="jugadores-bottom cuatro-jugadores-2x2">
            <div className="posicion-bottom-left">
              {jugadoresBottom[0] && renderAvatarHorizontal(jugadoresBottom[0].jugador, 'bottom')}
            </div>
            <div className="posicion-bottom-right">
              {jugadoresBottom[1] && renderAvatarHorizontal(jugadoresBottom[1].jugador, 'bottom')}
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
