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
                
                if (jugadores.length === 2) {
                  // 1v1: Cartas posicionadas en el centro de la mesa
                  // Usar rotación visual para que el jugador actual esté siempre abajo
                  
                  // Usar el orden del backend si está disponible, sino fallback al orden por ID
                  let jugadoresEnOrdenLogico: Jugador[];
                  
                  if (ordenJugadoresRonda && ordenJugadoresRonda.length === 2) {
                    // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
                    jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
                      jugadores.find(j => j.id === orden.id)
                    ).filter(Boolean) as Jugador[];
                    
                    console.log('🎯 Usando orden del backend para cartas 1v1:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  } else {
                    // Fallback: orden por ID (determinista)
                    jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
                    console.log('⚠️ Fallback: usando orden por ID para cartas 1v1:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  }
                  
                  // 🎭 ROTACIÓN DE PERSPECTIVA VISUAL PARA 1v1:
                  // Encontrar la posición del jugador actual en el orden lógico
                  const indexJugadorActual = jugadoresEnOrdenLogico.findIndex(j => j.id === jugadorActualId);
                  
                  // Aplicar rotación para que el jugador actual esté siempre abajo
                  let posicionesVisuales1v1: Jugador[];
                  
                  if (indexJugadorActual === -1) {
                    // Si no se encuentra el jugador actual, usar orden lógico sin rotación
                    posicionesVisuales1v1 = [...jugadoresEnOrdenLogico];
                    console.log('⚠️ Jugador actual no encontrado para cartas 1v1, usando orden lógico sin rotación');
                  } else {
                    // Calcular rotación para que el jugador actual esté en posición bottom-center
                    const rotacion = (2 - indexJugadorActual) % 2;
                    posicionesVisuales1v1 = [
                      ...jugadoresEnOrdenLogico.slice(rotacion),
                      ...jugadoresEnOrdenLogico.slice(0, rotacion)
                    ];
                    
                    console.log(`🎭 Rotación de perspectiva para cartas 1v1: ${rotacion} posiciones`);
                  }
                  
                  // DISTRIBUCIÓN VISUAL DE CARTAS 1v1 (después de rotación):
                  // Posición [0] = BOTTOM-CENTER (jugador actual)
                  // Posición [1] = TOP-CENTER (oponente)
                  
                  const bottomCenter = posicionesVisuales1v1[0];  // Jugador actual (después de rotación)
                  const topCenter = posicionesVisuales1v1[1];     // Oponente
                  
                  // Determinar posición de este jugador específico
                  let posicionFinal = 'posicion-bottom-center'; // default
                  
                  if (jugadorId === topCenter.id) {
                    posicionFinal = 'posicion-top-center';
                  } else if (jugadorId === bottomCenter.id) {
                    posicionFinal = 'posicion-bottom-center';
                  }
                  
                  positionClass = `${isCurrentPlayer ? 'jugador-actual-cartas' : 'oponente-cartas'} ${posicionFinal}`;
                } else if (jugadores.length === 4) {
                  // 2v2: MESA FIJA SIN ROTACIÓN DE PERSPECTIVA
                  // La disposición visual es SIEMPRE la misma para todos los jugadores
                  // Equipos intercalados en diagonal según el orden lógico del backend
                  
                  let jugadoresEnOrdenLogico: Jugador[];
                  
                  if (ordenJugadoresRonda && ordenJugadoresRonda.length === 4) {
                    // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
                    jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
                      jugadores.find(j => j.id === orden.id)
                    ).filter(Boolean) as Jugador[];
                    
                    console.log('🎯 Usando orden del backend para cartas 2v2:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  } else {
                    // Fallback: orden por ID (determinista)
                    jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
                    console.log('⚠️ Fallback: usando orden por ID para cartas 2v2:', 
                      jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
                  }
                  
                  // DISPOSICIÓN VISUAL FIJA PARA TODOS LOS JUGADORES:
                  // Mesa siempre se ve así (equipos intercalados en diagonal):
                  //    J1(A)  J4(B)
                  //    J2(B)  J3(A)
                  // 
                  // Posiciones fijas según el orden lógico:
                  // [0] = top-left (J1)
                  // [1] = bottom-left (J2) 
                  // [2] = bottom-right (J3)
                  // [3] = top-right (J4)
                  
                  const j1 = jugadoresEnOrdenLogico[0];  // top-left
                  const j2 = jugadoresEnOrdenLogico[1];  // bottom-left
                  const j3 = jugadoresEnOrdenLogico[2];  // bottom-right
                  const j4 = jugadoresEnOrdenLogico[3];  // top-right
                  
                  // Determinar posición fija de este jugador específico
                  let posicionFinal = '';
                  
                  if (jugadorId === j1.id) {
                    posicionFinal = 'posicion-top-left';
                  } else if (jugadorId === j2.id) {
                    posicionFinal = 'posicion-bottom-left';
                  } else if (jugadorId === j3.id) {
                    posicionFinal = 'posicion-bottom-right';
                  } else if (jugadorId === j4.id) {
                    posicionFinal = 'posicion-top-right';
                  }
                  
                  console.log(`📍 Mesa fija 2v2: ${jugador.nombreUsuario}(${jugadorId}) siempre en ${posicionFinal}`);
                  
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
      const connectionStatus = jugador.estadoConexion === 'conectado' ? 'conectado' : 'desconectado';
      
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
                <span className={`connection-dot ${connectionStatus}`}></span>
                <span className="status-text">{connectionStatus === 'conectado' ? 'Conectado' : 'Desconectado'}</span>
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
      // 1v1: Aplicar rotación visual para que el jugador actual esté siempre abajo
      
      // Usar el orden del backend si está disponible, sino fallback al orden por ID
      let jugadoresEnOrdenLogico: Jugador[];
      
      if (ordenJugadoresRonda && ordenJugadoresRonda.length === 2) {
        // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
        jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
          jugadores.find(j => j.id === orden.id)
        ).filter(Boolean) as Jugador[];
        
        console.log('🎯 Usando orden del backend para avatares 1v1:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
      } else {  
        // Fallback: orden por ID (determinista)
        jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
        console.log('⚠️ Fallback: usando orden por ID para avatares 1v1:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
      }
      
      // 🎭 ROTACIÓN DE PERSPECTIVA VISUAL PARA AVATARES 1v1:
      // Encontrar la posición del jugador actual en el orden lógico
      const indexJugadorActual = jugadoresEnOrdenLogico.findIndex(j => j.id === jugadorActual.id);
      
      // Aplicar rotación para que el jugador actual esté siempre abajo
      let posicionesVisuales1v1: Jugador[];
      
      if (indexJugadorActual === -1) {
        // Si no se encuentra el jugador actual, usar orden lógico sin rotación
        posicionesVisuales1v1 = [...jugadoresEnOrdenLogico];
        console.log('⚠️ Jugador actual no encontrado para avatares 1v1, usando orden lógico sin rotación');
      } else {
        // Calcular rotación para que el jugador actual esté en posición bottom
        const rotacion = (2 - indexJugadorActual) % 2;
        posicionesVisuales1v1 = [
          ...jugadoresEnOrdenLogico.slice(rotacion),
          ...jugadoresEnOrdenLogico.slice(0, rotacion)
        ];
        
        console.log(`🎭 Rotación de perspectiva para avatares 1v1: ${rotacion} posiciones`);
        console.log(`Orden visual resultante:`, posicionesVisuales1v1.map(j => `${j.nombreUsuario}(${j.id})`));
      }
      
      const bottomPlayer = posicionesVisuales1v1[0];  // Jugador actual (después de rotación)
      const topPlayer = posicionesVisuales1v1[1];     // Oponente (después de rotación)
      
      // Debug: mostrar distribución visual con perspectiva
      console.log('=== DISTRIBUCIÓN 1v1 CON PERSPECTIVA VISUAL ===');
      console.log('ORDEN LÓGICO (backend):', jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
      console.log('ORDEN VISUAL (rotado):', posicionesVisuales1v1.map(j => `${j.nombreUsuario}(${j.id})`));
      console.log('TOP (visual):', topPlayer.nombreUsuario, 'ID:', topPlayer.id);
      console.log('BOTTOM (visual):', bottomPlayer.nombreUsuario, 'ID:', bottomPlayer.id);
      console.log('Jugador actual está en BOTTOM:', bottomPlayer.id === jugadorActual.id);
      
      return (
        <div className="jugadores-perspectiva dos-jugadores-1v1">
          <div className="jugadores-top dos-jugadores-1v1">
            {renderAvatarHorizontal(topPlayer, 'top')}
          </div>
          <div className="jugadores-bottom dos-jugadores-1v1">
            {renderAvatarHorizontal(bottomPlayer, 'bottom')}
          </div>
        </div>
      );
    } else if (numJugadores === 4) {
      // 2v2: MESA FIJA CON PERSPECTIVA VISUAL PARA AVATARES
      // La mesa tiene posiciones fijas que no cambian entre rondas
      // Pero cada jugador ve la mesa rotada según su perspectiva
      
      // Usar el orden del backend si está disponible, sino fallback al orden por ID  
      let jugadoresEnOrdenLogico: Jugador[];
      
      if (ordenJugadoresRonda && ordenJugadoresRonda.length === 4) {
        // ✅ USAR ORDEN DEL BACKEND - orden lógico del truco para esta ronda
        jugadoresEnOrdenLogico = ordenJugadoresRonda.map(orden => 
          jugadores.find(j => j.id === orden.id)
        ).filter(Boolean) as Jugador[];
        
        console.log('🎯 Usando orden del backend para avatares 2v2:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id}, Equipo:${j.equipoId})`));
      } else {  
        // Fallback: orden por ID (determinista)
        jugadoresEnOrdenLogico = [...jugadores].sort((a, b) => a.id - b.id);
        console.log('⚠️ Fallback: usando orden por ID para avatares 2v2:', 
          jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id}, Equipo:${j.equipoId})`));
      }
      
      // DISPOSICIÓN VISUAL FIJA PARA TODOS LOS JUGADORES:
      // Mesa siempre se ve así (equipos intercalados en diagonal):
      //    J1(A)  J4(B)
      //    J2(B)  J3(A)
      // 
      // Posiciones fijas según el orden lógico:
      // [0] = top-left (J1)
      // [1] = bottom-left (J2) 
      // [2] = bottom-right (J3)
      // [3] = top-right (J4)
      
      const j1 = jugadoresEnOrdenLogico[0];  // top-left
      const j2 = jugadoresEnOrdenLogico[1];  // bottom-left
      const j3 = jugadoresEnOrdenLogico[2];  // bottom-right
      const j4 = jugadoresEnOrdenLogico[3];  // top-right
      
      // Debug: mostrar distribución visual FIJA
      console.log('=== DISTRIBUCIÓN 2x2 FIJA SIN PERSPECTIVA VISUAL ===');
      console.log('ORDEN LÓGICO (backend):', jugadoresEnOrdenLogico.map(j => `${j.nombreUsuario}(${j.id})`));
      console.log('POSICIONES FIJAS PARA TODOS:');
      console.log(`  TOP-LEFT: ${j1.nombreUsuario}(${j1.id}) - Equipo ${j1.equipoId}`);
      console.log(`  TOP-RIGHT: ${j4.nombreUsuario}(${j4.id}) - Equipo ${j4.equipoId}`);
      console.log(`  BOTTOM-LEFT: ${j2.nombreUsuario}(${j2.id}) - Equipo ${j2.equipoId}`);
      console.log(`  BOTTOM-RIGHT: ${j3.nombreUsuario}(${j3.id}) - Equipo ${j3.equipoId}`);
      console.log('La mesa se ve IGUAL para todos los jugadores');
      
      return (
        <div className="jugadores-perspectiva cuatro-jugadores-2x2">
          {/* Fila superior */}
          <div className="jugadores-top cuatro-jugadores-2x2">
            <div className="posicion-top-left">
              {renderAvatarHorizontal(j1, 'top')}
            </div>
            <div className="posicion-top-right">
              {renderAvatarHorizontal(j4, 'top')}
            </div>
          </div>
          
          {/* Fila inferior */}
          <div className="jugadores-bottom cuatro-jugadores-2x2">
            <div className="posicion-bottom-left">
              {renderAvatarHorizontal(j2, 'bottom')}
            </div>
            <div className="posicion-bottom-right">
              {renderAvatarHorizontal(j3, 'bottom')}
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
