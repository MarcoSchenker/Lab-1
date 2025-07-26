import React, { useState, useMemo } from 'react';
import './ActionsPanel.css'; // Add CSS import
import { calcularEnvido } from '../../utils/envidoCalculator';

interface Carta {
  idUnico: string;
  numero: number;
  palo: string;
  estaJugada: boolean;
  valorEnvido: number;
  valorTruco: number;
}

interface EstadoEnvido {
  cantado: boolean;
  querido: boolean;
  nivelActual: string;
  estadoResolucion: string;
  cantadoPorJugadorId: number | null;
  cantadoPorEquipoId: number | null;
  puntosEnJuego: number;
  equipoGanadorId: number | null;
  puntosDeclarados: Record<number, number>;
  jugadoresQueHanDeclarado?: number[]; // Lista de jugadores que ya declararon
  maxPuntosDeclaradosInfo?: { // Información sobre los puntos más altos declarados
    puntos: number;
    jugadorId: number | null;
    equipoId: number | null;
  };
  equipoConLaIniciativaId?: number | null; // Equipo que tiene la iniciativa en la declaración
  equipoRespondedorCantoId?: number | null; // ✅ Agregado campo faltante
  puedeDeclararSonBuenas?: boolean; // Helper calculado por el backend
  declaracionEnCurso?: boolean; // Si hay una declaración de puntos en curso
  jugadorTurnoDeclararPuntosId?: number | null; // Jugador cuyo turno es declarar puntos
}

interface EstadoTruco {
  cantado: boolean;
  querido: boolean;
  nivelActual: string;
  puntosEnJuego: number;
  cantadoPorJugadorId: number | null;
  cantadoPorEquipoId: number | null;
  estadoResolucion: string;
  equipoDebeResponderTrucoId: number | null;
  jugadorTurnoAlMomentoDelCantoId: number | null;
}

interface ActionsPanelProps {
  jugadorId: number | null;
  equipos: any[];
  envidoInfo: EstadoEnvido;
  trucoInfo: EstadoTruco;
  esMiTurno: boolean;
  trucoPendientePorEnvidoPrimero: boolean;
  manoActual?: number; // Agregamos información de la mano actual (1, 2, o 3)
  cartasJugador?: Carta[]; // Cartas en mano del jugador para calcular envido automáticamente
  cartasJugadas?: Carta[]; // ✅ PROBLEMA 5: Cartas ya jugadas por el jugador
  onCantar: (tipoCanto: string) => void;
  onResponderCanto: (respuesta: string) => void;
  onDeclararPuntosEnvido: (puntos: number) => void;
  onDeclararSonBuenas: () => void;
  onIrseAlMazo: () => void;
}

const ActionsPanel: React.FC<ActionsPanelProps> = ({
  jugadorId,
  equipos,
  envidoInfo,
  trucoInfo,
  esMiTurno,
  trucoPendientePorEnvidoPrimero,
  manoActual = 1,
  cartasJugador = [],
  cartasJugadas = [], // ✅ PROBLEMA 5: Cartas ya jugadas
  onCantar,
  onResponderCanto,
  onDeclararPuntosEnvido,
  onDeclararSonBuenas,
  onIrseAlMazo
}) => {
  // ✅ HOOKS MUST BE CALLED FIRST - before any early returns
  const [showEnvidoInput, setShowEnvidoInput] = useState(false);

  // ✅ PROBLEMA 5 CORREGIDO: Calcular envido incluyendo cartas ya jugadas
  const miEnvido = useMemo(() => {
    return calcularEnvido(cartasJugador, cartasJugadas);
  }, [cartasJugador, cartasJugadas]);

  // Early returns AFTER hooks
  if (!jugadorId) return null;

  const miEquipo = equipos.find(e => e.jugadoresIds.includes(jugadorId));
  if (!miEquipo) return null;

  // Verificar si puedo cantar envido (solo en la primera mano)
  const puedoCantarEnvido = (): boolean => {
    // El envido solo se puede cantar en la primera mano
    if (manoActual !== 1) {
      return false;
    }
    
    // ✅ CORRECCIÓN CRÍTICA: Lógica mejorada para "envido va primero"
    if (trucoPendientePorEnvidoPrimero) {
      // Cuando hay truco pendiente por "envido va primero", puedo cantar envido si:
      // 1. Soy del equipo que debe responder al truco
      // 2. No se ha cantado envido aún
      // 3. Es mi turno (esMiTurno debería ser true en este caso)
      // 4. ✅ CRÍTICO: El nivel sigue siendo TRUCO inicial (NO re-truco NI vale-cuatro)
      return trucoInfo.equipoDebeResponderTrucoId === miEquipo.id && 
             !envidoInfo.cantado && 
             trucoInfo.nivelActual === 'TRUCO' && // ✅ Solo TRUCO inicial, NO re-truco NI vale-cuatro
             esMiTurno;
    }
    
    // ✅ CORRECCIÓN PROBLEMA 1: Verificar que si hay truco cantado, solo sea nivel TRUCO inicial
    // No se puede cantar envido si ya hay RE-TRUCO o VALE-CUATRO cantado
    if (trucoInfo.cantado && (trucoInfo.nivelActual === 'RETRUCO' || trucoInfo.nivelActual === 'VALE_CUATRO')) {
      return false;
    }
    
    // Caso normal: puedo cantar envido si es mi turno y no hay envido cantado
    // Y no hay truco cantado Y pendiente de respuesta (porque entonces debería responder al truco)
    const noHayTrucoQueResponder = !trucoInfo.cantado || 
                                   trucoInfo.estadoResolucion !== 'cantado_pendiente_respuesta' ||
                                   trucoInfo.equipoDebeResponderTrucoId !== miEquipo.id;
    
    return esMiTurno && !envidoInfo.cantado && noHayTrucoQueResponder;
  };

  // Verificar si puedo cantar truco
  const puedoCantarTruco = (): boolean => {
    // ✅ PROBLEMA 2 CORREGIDO: No mostrar niveles de truco ya cantados
    // Puedo cantar truco inicial si no hay truco cantado
    if (!trucoInfo.cantado && esMiTurno) {
      return true;
    }
    
    // Puedo subir el truco si fue querido y no soy quien lo cantó originalmente
    if (trucoInfo.cantado && 
        trucoInfo.querido && 
        trucoInfo.cantadoPorEquipoId !== miEquipo.id &&
        esMiTurno) {
      
      // Verificar que puedo subir al siguiente nivel (no mostrar el mismo nivel)
      if (trucoInfo.nivelActual === 'TRUCO') {
        return true; // Puedo cantar RETRUCO
      } else if (trucoInfo.nivelActual === 'RETRUCO') {
        return true; // Puedo cantar VALE_CUATRO
      }
      // Si ya es VALE_CUATRO, no se puede subir más
    }
    
    return false;
  };

  // ✅ Función auxiliar para determinar qué nivel de truco puedo cantar
  const getNivelTrucoDisponible = (): string | null => {
    if (!trucoInfo.cantado) {
      return 'TRUCO'; // Primer canto
    }
    
    if (trucoInfo.querido && trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
      if (trucoInfo.nivelActual === 'TRUCO') {
        return 'RETRUCO';
      } else if (trucoInfo.nivelActual === 'RETRUCO') {
        return 'VALE_CUATRO';
      }
    }
    
    return null;
  };

  // ✅ NUEVA FUNCIÓN: Verificar si debo esperar respuesta a mi canto
  const deboEsperarRespuesta = (): boolean => {
    // Si canté truco y está pendiente de respuesta por el otro equipo
    if (trucoInfo.cantado &&
        trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
        trucoInfo.cantadoPorEquipoId === miEquipo.id &&
        trucoInfo.equipoDebeResponderTrucoId !== miEquipo.id) {
      return true;
    }
    
    // ✅ CORRECCIÓN: Solo considerar envido pendiente si realmente está esperando respuesta inicial
    // NO cuando ya fue aceptado y está en declaración de puntos
    if (envidoInfo.cantado &&
        envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
        envidoInfo.cantadoPorEquipoId === miEquipo.id &&
        envidoInfo.equipoRespondedorCantoId !== miEquipo.id &&
        !envidoInfo.querido) { // ✅ CRÍTICO: Solo si no fue aceptado aún
      return true;
    }
    
    return false;
  };

  // ✅ NUEVA FUNCIÓN: Verificar si debo esperar a que otros jugadores declaren puntos
  const deboEsperarDeclaracionPuntos = (): boolean => {
    // Si el envido fue aceptado y está en declaración de puntos
    if (envidoInfo.cantado &&
        envidoInfo.querido &&
        envidoInfo.estadoResolucion === 'querido_pendiente_puntos' &&
        envidoInfo.declaracionEnCurso) {
      
      // Si ya declaré mis puntos (estoy en la lista de jugadores que han declarado)
      const yaDeclareMisPuntos = envidoInfo.jugadoresQueHanDeclarado?.includes(jugadorId!) ?? false;
      
      // Si ya declaré pero el proceso de declaración no ha terminado
      if (yaDeclareMisPuntos && envidoInfo.jugadorTurnoDeclararPuntosId !== jugadorId) {
        return true; // Debo esperar a que otros declaren
      }
    }
    
    return false;
  };

  // ✅ NUEVA FUNCIÓN: Convertir nombres largos de envido a versiones cortas para UI
  const formatearNivelEnvido = (nivelEnvido: string): string => {
    const formatosCortos: { [key: string]: string } = {
      'ENVIDO': 'Envido',
      'REAL_ENVIDO': 'Real Envido',
      'FALTA_ENVIDO': 'Falta Envido',
      'ENVIDO_ENVIDO': 'Envido Envido',
      'ENVIDO_REAL_ENVIDO': 'Envido Real Envido',
      'ENVIDO_FALTA_ENVIDO': 'Envido + Falta Envido',
      'REAL_ENVIDO_FALTA_ENVIDO': 'Real + Falta Envido',
      'ENVIDO_ENVIDO_REAL_ENVIDO': 'Envido Envido + Real Envido',
      'ENVIDO_ENVIDO_FALTA_ENVIDO': 'Envido Envido + Falta Envido',
      'ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': 'Envido + Real + Falta Envido',
      'ENVIDO_ENVIDO_REAL_ENVIDO_FALTA_ENVIDO': 'Envido Envido + Real + Falta Envido'
    };

    return formatosCortos[nivelEnvido] || nivelEnvido;
  };

  // Verificar si debo responder a un canto
  const deboResponderCanto = (): boolean => {
    // ✅ CORRECCIÓN MEJORADA: Priorizar envido durante "envido va primero", truco en situaciones normales
    
    // CASO ESPECIAL: Durante "envido va primero", priorizar respuestas de envido
    if (trucoPendientePorEnvidoPrimero) {
      // Si hay envido pendiente de respuesta durante "envido va primero", priorizarlo
      if (envidoInfo.cantado && 
          envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          envidoInfo.cantadoPorEquipoId !== miEquipo.id &&
          !envidoInfo.declaracionEnCurso) {
        return true;
      }
      
      // Solo si no hay envido pendiente, considerar truco
      if (trucoInfo.cantado &&
          trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
          trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
        return true;
      }
    } else {
      // CASO NORMAL: Priorizar truco sobre envido cuando ambos están pendientes
      
      // 1. PRIORIDAD ALTA: Responder a truco pendiente (incluye recantos como VALE_CUATRO)
      if (trucoInfo.cantado &&
          trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
          trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
        return true;
      }
      
      // 2. PRIORIDAD BAJA: Responder a envido solo si NO hay truco pendiente
      if (envidoInfo.cantado && 
          envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          envidoInfo.cantadoPorEquipoId !== miEquipo.id &&
          !envidoInfo.declaracionEnCurso) {
        
        // ✅ VALIDACIÓN ADICIONAL: Solo mostrar envido si no hay truco pendiente de respuesta
        const hayTrucoPendiente = trucoInfo.cantado && 
                                 trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
                                 trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
        
        if (!hayTrucoPendiente) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Verificar si debo declarar puntos
  const deboDeclararPuntos = (): boolean => {
    try {
      // Si el envido está en estado "querido_pendiente_puntos" Y es mi turno específico para declarar
      const esTurnoDeclarar = envidoInfo.jugadorTurnoDeclararPuntosId === jugadorId;
      const estadoCorrecto = envidoInfo.estadoResolucion === 'querido_pendiente_puntos' && 
                            envidoInfo.cantado && 
                            envidoInfo.declaracionEnCurso;
      
      // Verificar que no haya declarado ya
      const noHaDeclarado = !(envidoInfo.jugadoresQueHanDeclarado?.includes(jugadorId) ?? false);
      
      return Boolean(estadoCorrecto && esTurnoDeclarar && noHaDeclarado);
    } catch (error) {
      console.error('Error checking deboDeclararPuntos:', error);
      return false;
    }
  };

  // Verificar si puedo decir "Son Buenas"
  const puedoDeclararSonBuenas = (): boolean => {
    try {
      if (!deboDeclararPuntos()) return false;
      
      // Solo se puede decir "Son Buenas" si ya hay puntos declarados por el equipo rival
      // y soy del equipo que NO tiene la iniciativa (no declaró primero)
      const hayPuntosDeclarados = envidoInfo.maxPuntosDeclaradosInfo && 
                                  envidoInfo.maxPuntosDeclaradosInfo.puntos > -1;
      
      const soySegunoEnDeclarar = envidoInfo.equipoConLaIniciativaId !== miEquipo.id;
      
      return Boolean(hayPuntosDeclarados && soySegunoEnDeclarar);
    } catch (error) {
      console.error('Error checking puedoDeclararSonBuenas:', error);
      return false;
    }
  };

  const handleDeclararPuntos = () => {
    // Usar el envido calculado automáticamente
    onDeclararPuntosEnvido(miEnvido);
    setShowEnvidoInput(false);
  };

  const handleSonBuenas = () => {
    onDeclararSonBuenas();
    setShowEnvidoInput(false);
  };

  // Si debo declarar puntos de envido
  if (deboDeclararPuntos()) {
    const puntosRivales = envidoInfo.maxPuntosDeclaradosInfo?.puntos || -1;
    const nombreRival = puntosRivales > -1 ? 
      `Rival declaró ${puntosRivales}` : 
      'Declara primero';
    
    return (
      <div className="actions-panel envido-declaration">
        <div className="panel-title">
          <span>Declara tus puntos de envido</span>
          {puntosRivales > -1 && (
            <div className="text-sm text-yellow-300 mt-1">
              {nombreRival} - Tu envido: {miEnvido}
            </div>
          )}
        </div>
        
        <div className="envido-actions">
          {!showEnvidoInput ? (
            <>
              <button 
                className="btn-action btn-declare-points"
                onClick={() => setShowEnvidoInput(true)}
              >
                Declarar Puntos ({miEnvido})
              </button>
              
              {/* Mostrar "Son Buenas" solo si corresponde */}
              {puedoDeclararSonBuenas() && puntosRivales >= miEnvido && (
                <button 
                  className="btn-action btn-son-buenas"
                  onClick={handleSonBuenas}
                >
                  Son Buenas ({puntosRivales} gana)
                </button>
              )}
            </>
          ) : (
            <div className="envido-form">
              <div className="envido-info">
                <p>Tu envido es: <strong>{miEnvido}</strong></p>
                {puntosRivales > -1 && (
                  <p className="text-sm">Rival declaró: <strong>{puntosRivales}</strong></p>
                )}
                <p className="text-sm opacity-75">Calculado automáticamente con tus cartas</p>
              </div>
              <button 
                className="btn-action btn-confirm"
                onClick={handleDeclararPuntos}
              >
                Confirmar {miEnvido}
              </button>
              <button 
                type="button" 
                className="btn-action btn-cancel"
                onClick={() => setShowEnvidoInput(false)}
              >
                Cancelar
              </button>
              
              {/* "Son Buenas" también disponible aquí si corresponde */}
              {puedoDeclararSonBuenas() && puntosRivales >= miEnvido && (
                <button 
                  className="btn-action btn-son-buenas"
                  onClick={handleSonBuenas}
                >
                  Son Buenas ({puntosRivales} gana)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Verificar si hay "envido va primero" activo
  const hayEnvidoVaPrimero = (): boolean => {
    // ✅ CORRECCIÓN CRÍTICA: Solo cuando el nivel sigue siendo TRUCO inicial
    // Si ya se cantó re-truco o vale-cuatro, se acepta implícitamente el truco y envido ya no es posible
    return trucoPendientePorEnvidoPrimero && 
           trucoInfo.cantado && 
           trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
           trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
           trucoInfo.nivelActual === 'TRUCO' && // ✅ CRÍTICO: Solo TRUCO inicial, NO re-truco NI vale-cuatro
           manoActual === 1 &&
           !envidoInfo.cantado;
  };

  // Si hay "envido va primero", mostrar mensaje especial
  if (hayEnvidoVaPrimero()) {
    return (
      <div className="actions-panel envido-va-primero">
        <div className="panel-title">
          <span>⚡ Envido va primero</span>
          <div className="text-sm text-yellow-300 mt-1">
            Tienes truco cantado pendiente, pero puedes cantar envido primero
          </div>
        </div>
        
        <div className="envido-actions">
          <button 
            className="btn-action btn-envido"
            onClick={() => onCantar('ENVIDO')}
          >
            Envido
          </button>
          <button 
            className="btn-action btn-real-envido"
            onClick={() => onCantar('REAL_ENVIDO')}
          >
            Real Envido
          </button>
          <button 
            className="btn-action btn-falta-envido"
            onClick={() => onCantar('FALTA_ENVIDO')}
          >
            Falta Envido
          </button>
        </div>
        
        <div className="text-xs text-gray-300 mt-2">
          O responde al truco pendiente:
        </div>
        <div className="truco-pendiente-actions">
          <button 
            className="btn-action btn-quiero"
            onClick={() => onResponderCanto('QUIERO')}
          >
            Quiero Truco
          </button>
          <button 
            className="btn-action btn-no-quiero"
            onClick={() => onResponderCanto('NO_QUIERO')}
          >
            No Quiero Truco
          </button>
          {/* ✅ CORRECCIÓN ADICIONAL: Permitir recantos de truco en "envido va primero" */}
          {trucoInfo.nivelActual === 'TRUCO' && (
            <button 
              className="btn-action btn-retruco"
              onClick={() => onResponderCanto('RETRUCO')}
            >
              Retruco
            </button>
          )}
          {trucoInfo.nivelActual === 'RETRUCO' && (
            <button 
              className="btn-action btn-vale-cuatro"
              onClick={() => onResponderCanto('VALE_CUATRO')}
            >
              Vale Cuatro
            </button>
          )}
        </div>
      </div>
    );
  }

  // Si debo responder a un canto
  if (deboResponderCanto()) {
    // ✅ CORRECCIÓN MEJORADA: Determinar correctamente qué tipo de canto responder según el contexto
    
    let esEnvido = false;
    let esTruco = false;
    let cantadoTipo = '';
    let nivelActual = '';
    
    // CASO ESPECIAL: Durante "envido va primero", priorizar envido
    if (trucoPendientePorEnvidoPrimero) {
      // Verificar primero si hay envido pendiente (mayor prioridad durante "envido va primero")
      if (envidoInfo.cantado && 
          envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          envidoInfo.cantadoPorEquipoId !== miEquipo.id &&
          !envidoInfo.declaracionEnCurso) {
        esEnvido = true;
        cantadoTipo = 'envido';
        nivelActual = envidoInfo.nivelActual;
      }
      // Solo si no hay envido pendiente, verificar truco
      else if (trucoInfo.cantado &&
               trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
               trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
               trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
        esTruco = true;
        cantadoTipo = 'truco';
        nivelActual = trucoInfo.nivelActual;
      }
    } else {
      // CASO NORMAL: Prioridad Truco > Envido
      
      // Verificar primero si hay truco pendiente (mayor prioridad)
      if (trucoInfo.cantado &&
          trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
          trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
          trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
        esTruco = true;
        cantadoTipo = 'truco';
        nivelActual = trucoInfo.nivelActual;
      }
      // Solo si no hay truco pendiente, verificar envido
      else if (envidoInfo.cantado && 
               envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
               envidoInfo.cantadoPorEquipoId !== miEquipo.id &&
               !envidoInfo.declaracionEnCurso) {
        esEnvido = true;
        cantadoTipo = 'envido';
        nivelActual = envidoInfo.nivelActual;
      }
    }
    
    return (
      <div className="actions-panel response-panel">
        <div className="panel-title">
          <span>Responder {cantadoTipo}: {esEnvido ? formatearNivelEnvido(nivelActual) : nivelActual}</span>
        </div>
        
        <div className="response-actions">
          <button 
            className="btn-action btn-quiero"
            onClick={() => onResponderCanto('QUIERO')}
          >
            Quiero
          </button>
          
          <button 
            className="btn-action btn-no-quiero"
            onClick={() => onResponderCanto('NO_QUIERO')}
          >
            No Quiero
          </button>

          {/* Recantos para envido */}
          {esEnvido && (
            <div className="recantos-envido">
              {/* ✅ PROBLEMA 2 CORREGIDO: Opciones completas de encadenamiento de envido */}
              {nivelActual === 'ENVIDO' && (
                <>
                  <button 
                    className="btn-action btn-envido"
                    onClick={() => onCantar('ENVIDO')}
                  >
                    Envido
                  </button>
                  <button 
                    className="btn-action btn-real-envido"
                    onClick={() => onCantar('REAL_ENVIDO')}
                  >
                    Real Envido
                  </button>
                  <button 
                    className="btn-action btn-falta-envido"
                    onClick={() => onCantar('FALTA_ENVIDO')}
                  >
                    Falta Envido
                  </button>
                </>
              )}
              {nivelActual === 'REAL_ENVIDO' && (
                <button 
                  className="btn-action btn-falta-envido"
                  onClick={() => onCantar('FALTA_ENVIDO')}
                >
                  Falta Envido
                </button>
              )}
              {(nivelActual === 'ENVIDO_ENVIDO') && (
                <>
                  <button 
                    className="btn-action btn-real-envido"
                    onClick={() => onCantar('REAL_ENVIDO')}
                  >
                    Real Envido
                  </button>
                  <button 
                    className="btn-action btn-falta-envido"
                    onClick={() => onCantar('FALTA_ENVIDO')}
                  >
                    Falta Envido
                  </button>
                </>
              )}
              {(nivelActual === 'ENVIDO_REAL_ENVIDO' || 
                nivelActual === 'ENVIDO_ENVIDO_REAL_ENVIDO') && (
                <button 
                  className="btn-action btn-falta-envido"
                  onClick={() => onCantar('FALTA_ENVIDO')}
                >
                  Falta Envido
                </button>
              )}
            </div>
          )}

          {/* Recantos para truco */}
          {esTruco && (
            <div className="recantos-truco">
              {nivelActual === 'TRUCO' && (
                <button 
                  className="btn-action btn-retruco"
                  onClick={() => onResponderCanto('RETRUCO')}
                >
                  Retruco
                </button>
              )}
              {nivelActual === 'RETRUCO' && (
                <button 
                  className="btn-action btn-vale-cuatro"
                  onClick={() => onResponderCanto('VALE_CUATRO')}
                >
                  Vale Cuatro
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Panel normal de acciones
  // ✅ NUEVA CORRECCIÓN: Verificar si debo esperar a que otros declaren puntos
  if (deboEsperarDeclaracionPuntos()) {
    return (
      <div className="actions-panel">
        <div className="panel-title">
          <span>Esperando declaración</span>
        </div>
        <div className="text-sm text-gray-400 mt-2 text-center">
          Espera a que tu oponente declare sus puntos de envido
        </div>
      </div>
    );
  }

  // ✅ CORRECCIÓN PROBLEMA 2: Verificar si debo esperar respuesta a mi canto
  if (deboEsperarRespuesta()) {
    return (
      <div className="actions-panel">
        <div className="panel-title">
          <span>Esperando respuesta</span>
        </div>
        <div className="text-sm text-gray-400 mt-2 text-center">
          Espera a que tu oponente responda a tu canto
        </div>
      </div>
    );
  }

  // ✅ MEJORA: Solo mostrar acciones generales si es mi turno
  if (!esMiTurno) {
    return (
      <div className="actions-panel">
        <div className="panel-title">
          <span>No es tu turno</span>
        </div>
        <div className="text-sm text-gray-400 mt-2 text-center">
          Espera a que tu oponente termine su jugada
        </div>
      </div>
    );
  }

  return (
    <div className="actions-panel normal-actions">
      <div className="panel-title">
        <span>Acciones disponibles</span>
      </div>
      
      <div className="action-groups">
        {/* Acciones de Envido */}
        {puedoCantarEnvido() && (
          <div className="action-group envido-group">
            <span className="group-title">Envido</span>
            <div className="action-buttons">
              <button 
                className="btn-action btn-envido"
                onClick={() => onCantar('ENVIDO')}
              >
                Envido
              </button>
              <button 
                className="btn-action btn-real-envido"
                onClick={() => onCantar('REAL_ENVIDO')}
              >
                Real Envido
              </button>
              <button 
                className="btn-action btn-falta-envido"
                onClick={() => onCantar('FALTA_ENVIDO')}
              >
                Falta Envido
              </button>
            </div>
          </div>
        )}

        {/* Acciones de Truco */}
        {puedoCantarTruco() && (
          <div className="action-group truco-group">
            <span className="group-title">Truco</span>
            <div className="action-buttons">
              {/* ✅ PROBLEMA 2 CORREGIDO: Solo mostrar el nivel de truco disponible */}
              {getNivelTrucoDisponible() === 'TRUCO' && (
                <button 
                  className="btn-action btn-truco"
                  onClick={() => onCantar('TRUCO')}
                >
                  Truco
                </button>
              )}
              {getNivelTrucoDisponible() === 'RETRUCO' && (
                <button 
                  className="btn-action btn-retruco"
                  onClick={() => onCantar('RETRUCO')}
                >
                  Retruco
                </button>
              )}
              {getNivelTrucoDisponible() === 'VALE_CUATRO' && (
                <button 
                  className="btn-action btn-vale-cuatro"
                  onClick={() => onCantar('VALE_CUATRO')}
                >
                  Vale Cuatro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Irse al mazo */}
        <div className="action-group mazo-group">
          <button 
            className="btn-action btn-mazo"
            onClick={onIrseAlMazo}
          >
            Irse al Mazo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionsPanel;
