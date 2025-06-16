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
  cartasJugador?: Carta[]; // Cartas del jugador para calcular envido automáticamente
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
  onCantar,
  onResponderCanto,
  onDeclararPuntosEnvido,
  onDeclararSonBuenas,
  onIrseAlMazo
}) => {
  const [showEnvidoInput, setShowEnvidoInput] = useState(false);

  // Calcular envido automáticamente basado en las cartas del jugador
  const miEnvido = useMemo(() => {
    return calcularEnvido(cartasJugador);
  }, [cartasJugador]);

  if (!jugadorId) return null;

  const miEquipo = equipos.find(e => e.jugadoresIds.includes(jugadorId));
  if (!miEquipo) return null;

  // Verificar si puedo cantar envido (solo en la primera mano)
  const puedoCantarEnvido = (): boolean => {
    // El envido solo se puede cantar en la primera mano
    if (manoActual !== 1) {
      return false;
    }
    
    if (trucoPendientePorEnvidoPrimero) {
      return trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
    }
    return esMiTurno && !envidoInfo.cantado;
  };

  // Verificar si puedo cantar truco
  const puedoCantarTruco = (): boolean => {
    return esMiTurno && !trucoInfo.cantado;
  };

  // Verificar si debo responder a un canto
  const deboResponderCanto = (): boolean => {
    // Para envido - Solo si NO soy quien cantó
    if (envidoInfo.cantado && 
        envidoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
        envidoInfo.cantadoPorEquipoId !== miEquipo.id) {
      return true;
    }
    
    // Para truco - Solo si soy del equipo que debe responder
    if (trucoInfo.cantado &&
        trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
        trucoInfo.equipoDebeResponderTrucoId === miEquipo.id &&
        trucoInfo.cantadoPorEquipoId !== miEquipo.id) {
      return true;
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
    return trucoPendientePorEnvidoPrimero && 
           trucoInfo.cantado && 
           trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
           manoActual === 1;
  };

  // Si hay "envido va primero", mostrar mensaje especial
  if (hayEnvidoVaPrimero() && puedoCantarEnvido()) {
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
        </div>
      </div>
    );
  }

  // Si debo responder a un canto
  if (deboResponderCanto()) {
    const esEnvido = envidoInfo.cantado && envidoInfo.cantadoPorEquipoId !== miEquipo.id;
    const esTruco = trucoInfo.cantado && trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
    
    const cantadoTipo = esEnvido ? 'envido' : 'truco';
    const nivelActual = esEnvido ? envidoInfo.nivelActual : trucoInfo.nivelActual;
    
    return (
      <div className="actions-panel response-panel">
        <div className="panel-title">
          <span>Responder {cantadoTipo}: {nivelActual}</span>
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
              {(nivelActual === 'ENVIDO_ENVIDO' || nivelActual === 'REAL_ENVIDO') && (
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

  // Panel especial: Envido va primero
  // Si hay un truco pendiente de respuesta en primera mano y puede cantar envido
  const hayTrucoPendienteEnPrimeraMano = trucoInfo.cantado && 
                                        trucoInfo.estadoResolucion === 'cantado_pendiente_respuesta' &&
                                        manoActual === 1 &&
                                        trucoInfo.equipoDebeResponderTrucoId === miEquipo.id;
  
  const puedeInvocarEnvidoPrimero = hayTrucoPendienteEnPrimeraMano && 
                                   !envidoInfo.cantado && 
                                   esMiTurno;

  if (puedeInvocarEnvidoPrimero) {
    return (
      <div className="actions-panel envido-primero-panel">
        <div className="panel-title">
          <span>¡Envido va primero!</span>
          <div className="text-sm text-yellow-300 mt-1">
            Puedes cantar envido antes de responder al truco
          </div>
        </div>
        
        <div className="envido-primero-actions">
          {/* Acciones de envido */}
          <div className="action-group envido-group">
            <span className="group-title">Cantar Envido</span>
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
          
          {/* O responder al truco directamente */}
          <div className="action-group truco-response-group">
            <span className="group-title">O responder al Truco</span>
            <div className="action-buttons">
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
              {trucoInfo.nivelActual === 'TRUCO' && (
                <button 
                  className="btn-action btn-retruco"
                  onClick={() => onResponderCanto('RETRUCO')}
                >
                  Retruco
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Panel normal de acciones
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
              <button 
                className="btn-action btn-truco"
                onClick={() => onCantar('TRUCO')}
              >
                Truco
              </button>
              {trucoInfo.nivelActual === 'TRUCO' && (
                <button 
                  className="btn-action btn-retruco"
                  onClick={() => onCantar('RETRUCO')}
                >
                  Retruco
                </button>
              )}
              {trucoInfo.nivelActual === 'RETRUCO' && (
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
