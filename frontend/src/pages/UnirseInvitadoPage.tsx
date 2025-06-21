import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './UnirseInvitadoPage.css';

interface SalaInfo {
  codigo_sala: string;
  max_jugadores: number;
  jugadores_actuales: number;
  puntos_victoria: number;
  creador: string;
  tiempo_expiracion: string | null;
}

const UnirseInvitadoPage: React.FC = () => {
  const { codigo_sala } = useParams<{ codigo_sala: string }>();
  const navigate = useNavigate();
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [salaInfo, setSalaInfo] = useState<SalaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uniendose, setUniendose] = useState(false);

  useEffect(() => {
    // Cargar información de la sala
    const cargarInfoSala = async () => {
      try {
        const response = await fetch(`/api/salas/info/${codigo_sala}`);
        if (response.ok) {
          const sala = await response.json();
          setSalaInfo(sala);
        } else {
          const error = await response.json();
          setError(error.error || 'Sala no encontrada o no disponible');
        }
      } catch (err) {
        console.error('Error al cargar info de sala:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    if (codigo_sala) {
      cargarInfoSala();
    }
  }, [codigo_sala]);

  const handleUnirse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombreInvitado.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (nombreInvitado.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setUniendose(true);
    setError(null);

    try {
      const response = await fetch(`/api/salas/unirse-invitado/${codigo_sala}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_invitado: nombreInvitado.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar información de invitado en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('isAnonymous', 'true');
        localStorage.setItem('nombre_usuario', data.nombre_usuario);
        localStorage.setItem('usuario_id', data.usuario_id.toString());

        // Redirigir al juego
        if (data.juego_iniciado) {
          navigate(`/online-game-page/${codigo_sala}`);
        } else {
          // Redirigir a una sala de espera o mostrar mensaje
          navigate(`/salas`);
        }
      } else {
        setError(data.error || 'Error al unirse a la sala');
      }
    } catch (err) {
      console.error('Error al unirse como invitado:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setUniendose(false);
    }
  };

  const formatearTiempoRestante = (tiempoExpiracion: string | null) => {
    if (!tiempoExpiracion) return 'Sin límite';
    
    const ahora = new Date();
    const expiracion = new Date(tiempoExpiracion);
    const diferencia = expiracion.getTime() - ahora.getTime();
    
    if (diferencia <= 0) return 'Expirada';
    
    const horas = Math.floor(diferencia / 3600000);
    const minutos = Math.floor((diferencia % 3600000) / 60000);
    
    if (horas > 0) {
      return `${horas}h ${minutos}m`;
    } else {
      return `${minutos}m`;
    }
  };

  if (loading) {
    return (
      <div className="unirse-invitado-container">
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Cargando información de la sala...</p>
        </div>
      </div>
    );
  }

  if (error && !salaInfo) {
    return (
      <div className="unirse-invitado-container">
        <div className="error-card">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="btn-volver"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="unirse-invitado-container">
      <div className="invitation-card">
        <div className="card-header">
          <h1>🎮 Te han invitado a jugar Truco</h1>
          <p>¡Únete a la partida como invitado!</p>
        </div>

        {salaInfo && (
          <div className="sala-info">
            <h3>Información de la Sala</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Código:</span>
                <span className="value">{salaInfo.codigo_sala}</span>
              </div>
              <div className="info-item">
                <span className="label">Creada por:</span>
                <span className="value">{salaInfo.creador}</span>
              </div>
              <div className="info-item">
                <span className="label">Jugadores:</span>
                <span className="value">{salaInfo.jugadores_actuales}/{salaInfo.max_jugadores}</span>
              </div>
              <div className="info-item">
                <span className="label">Puntos para ganar:</span>
                <span className="value">{salaInfo.puntos_victoria}</span>
              </div>
              <div className="info-item">
                <span className="label">Expira en:</span>
                <span className="value">{formatearTiempoRestante(salaInfo.tiempo_expiracion)}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleUnirse} className="unirse-form">
          <div className="form-group">
            <label htmlFor="nombreInvitado">
              ¿Cómo te gustaría que te llamen?
            </label>
            <input
              type="text"
              id="nombreInvitado"
              value={nombreInvitado}
              onChange={(e) => setNombreInvitado(e.target.value)}
              placeholder="Ingresa tu nombre..."
              maxLength={20}
              disabled={uniendose}
              className="nombre-input"
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={uniendose || !nombreInvitado.trim()}
            className="btn-unirse"
          >
            {uniendose ? (
              <>
                <div className="spinner-small"></div>
                Uniéndose...
              </>
            ) : (
              '🎯 Unirse a la partida'
            )}
          </button>
        </form>

        <div className="invitation-footer">
          <p>
            <small>
              ℹ️ Te unirás como invitado. No necesitas crear una cuenta.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnirseInvitadoPage;
