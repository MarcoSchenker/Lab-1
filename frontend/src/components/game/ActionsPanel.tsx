import React, { useState } from 'react';

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
  onCantar,
  onResponderCanto,
  onDeclararPuntosEnvido,
  onDeclararSonBuenas,
  onIrseAlMazo
}) => {
  const [puntosEnvido, setPuntosEnvido] = useState<string>('');
  const [showEnvidoInput, setShowEnvidoInput] = useState(false);

  if (!jugadorId) return null;

  const miEquipo = equipos.find(e => e.jugadoresIds.includes(jugadorId));
  if (!miEquipo) return null;

  // Verificar si puedo cantar envido
  const puedoCantarEnvido = (): boolean => {
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
    if (envidoInfo.cantado && 
        envidoInfo.estadoResolucion === 'pendiente_respuesta' &&
        envidoInfo.cantadoPorEquipoId !== miEquipo.id) {
      return true;
    }
    
    if (trucoInfo.cantado &&
        trucoInfo.estadoResolucion === 'pendiente_respuesta' &&
        trucoInfo.equipoDebeResponderTrucoId === miEquipo.id) {
      return true;
    }
    
    return false;
  };

  // Verificar si debo declarar puntos
  const deboDeclararPuntos = (): boolean => {
    return envidoInfo.estadoResolucion === 'querido_pendiente_puntos' &&
           envidoInfo.cantado &&
           esMiTurno;
  };

  // Verificar si puedo decir "Son Buenas"
  const puedoDeclararSonBuenas = (): boolean => {
    if (!deboDeclararPuntos()) return false;
    return Object.keys(envidoInfo.puntosDeclarados).length > 0;
  };

  const handleDeclararPuntos = (e: React.FormEvent) => {
    e.preventDefault();
    const puntos = parseInt(puntosEnvido);
    if (isNaN(puntos) || puntos < 0 || puntos > 33) {
      alert('Puntos de envido inválidos (0-33)');
      return;
    }
    onDeclararPuntosEnvido(puntos);
    setPuntosEnvido('');
    setShowEnvidoInput(false);
  };

  const handleSonBuenas = () => {
    onDeclararSonBuenas();
    setShowEnvidoInput(false);
  };

  // Si debo declarar puntos de envido
  if (deboDeclararPuntos()) {
    return (
      <div className="actions-panel envido-declaration">
        <div className="panel-title">
          <span>Declara tus puntos de envido</span>
        </div>
        
        <div className="envido-actions">
          {!showEnvidoInput ? (
            <>
              <button 
                className="btn-action btn-declare-points"
                onClick={() => setShowEnvidoInput(true)}
              >
                Declarar Puntos
              </button>
              
              {puedoDeclararSonBuenas() && (
                <button 
                  className="btn-action btn-son-buenas"
                  onClick={handleSonBuenas}
                >
                  Son Buenas
                </button>
              )}
            </>
          ) : (
            <form onSubmit={handleDeclararPuntos} className="envido-form">
              <input
                type="number"
                value={puntosEnvido}
                onChange={(e) => setPuntosEnvido(e.target.value)}
                placeholder="Puntos (0-33)"
                min="0"
                max="33"
                className="envido-input"
                autoFocus
              />
              <button type="submit" className="btn-action btn-confirm">
                Confirmar
              </button>
              <button 
                type="button" 
                className="btn-action btn-cancel"
                onClick={() => {
                  setShowEnvidoInput(false);
                  setPuntosEnvido('');
                }}
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Si debo responder a un canto
  if (deboResponderCanto()) {
    const cantadoTipo = envidoInfo.cantado ? 'envido' : 'truco';
    const nivelActual = envidoInfo.cantado ? envidoInfo.nivelActual : trucoInfo.nivelActual;
    
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
