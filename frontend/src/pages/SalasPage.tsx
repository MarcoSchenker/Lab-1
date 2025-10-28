import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {IoAddCircleOutline, IoFilterOutline, IoLockClosed, IoLockOpen, IoRefreshOutline } from "react-icons/io5";
import { io, Socket } from 'socket.io-client';
import './SalasPage.css';
import Header from '../components/HeaderDashboard';

const backendUrl = process.env.VITE_API_URL || 'http://localhost:3001';

// Interfaces
interface Sala {
  codigo_sala: string;
  tipo: 'publica' | 'privada';
  puntos_victoria: number;
  max_jugadores: number;
  jugadores_actuales: number;
  fecha_inicio: string;
  tiempo_expiracion: string | null;
  creador?: string;
}

const SalasPage: React.FC = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalSalas, setTotalSalas] = useState(0);
  const salasPerPage = 6;
  const [showModal, setShowModal] = useState(false);
  const [showJoinPrivateModal, setShowJoinPrivateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [codigoPrivado, setCodigoPrivado] = useState('');
  const [salaSeleccionada, setSalaSeleccionada] = useState<string | null>(null);
  const [enlaceInvitacion, setEnlaceInvitacion] = useState<string>('');
  const [filtro, setFiltro] = useState<'todas' | 'publicas' | 'privadas'>('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForPlayers, setWaitingForPlayers] = useState<string | null>(null);

  const isAnonymous = localStorage.getItem('isAnonymous') === 'true';
  
  // Estado para nueva sala
  const [nuevaSala, setNuevaSala] = useState({
    tipo: 'publica',
    puntos_victoria: 15,
    max_jugadores: 4,
    codigo_acceso: ''
  });

  // Cargar salas desde el servidor
  useEffect(() => {
    fetchSalas();
    // Actualizar salas cada 30 segundos (menos frecuente para mejor UX con paginación)
    const intervalId = setInterval(fetchSalas, 30000);
    return () => clearInterval(intervalId);
  }, [filtro, paginaActual]);

  // ✅ SOCKET SETUP FOR REDIRECTION EVENT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect socket for lobby events
    const socket = io(backendUrl, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SalasPage] Socket conectado para lobby:', socket.id);
      socket.emit('autenticar_socket', token);
    });

    socket.on('autenticacion_exitosa', () => {
      console.log('[SalasPage] Socket autenticado en lobby');
    });

    // ✅ KEY EVENT: Listen for game redirection
    socket.on('iniciar_redireccion_juego', (data: { codigoSala: string }) => {
      console.log('[SalasPage] 🎮 Recibido evento de redirección a juego:', data);
      setWaitingForPlayers(null);
      // Navigate to the game page immediately
      navigate(`/online-game-page/${data.codigoSala}`);
    });

    socket.on('connect_error', (error) => {
      console.error('[SalasPage] Error de conexión socket:', error);
    });

    return () => {
      console.log('[SalasPage] Desconectando socket del lobby');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [navigate]);

  const fetchSalas = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const isGuest = isAnonymous || !token;
      
      // Agregar parámetros de paginación y filtro de salas llenas
      const params = new URLSearchParams({
        filtro: isGuest ? 'publicas' : filtro,
        pagina: paginaActual.toString(),
        limite: salasPerPage.toString(),
        excluir_llenas: 'true'
      });
      
      // Usar ruta pública para invitados o ruta privada para usuarios registrados
      const endpoint = isGuest ? `/api/salas/publicas?${params}` : `/api/salas?${params}`;
      const headers: Record<string, string> = {};
      if (!isGuest && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error('Error al cargar las salas');
      }

      const data = await response.json();
      setSalas(data.salas || []);
      if (data.paginacion) {
        setTotalPaginas(data.paginacion.total_paginas);
        setTotalSalas(data.paginacion.total_salas);
      }
    } catch (error) {
      console.error('Error al obtener salas:', error);
      setError('No se pudieron cargar las salas. Inténtalo más tarde.');
      setSalas([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario de creación de sala
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setNuevaSala({
        ...nuevaSala,
        [name]: parseInt(value, 10)
      });
    } else {
      setNuevaSala({
        ...nuevaSala,
        [name]: value
      });
    }
    
    // Si cambia el tipo a pública, limpiar el código de acceso
    if (name === 'tipo' && value === 'publica') {
      setNuevaSala(prev => ({
        ...prev,
        codigo_acceso: ''
      }));
    }
  };

  // Función para crear una nueva sala
  const crearSala = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No hay sesión activa. Por favor inicia sesión de nuevo.');
        return;
      }
      
      // Validar formulario
      if (nuevaSala.tipo === 'privada' && (!nuevaSala.codigo_acceso || nuevaSala.codigo_acceso.length < 4)) {
        setError('El código de acceso debe tener al menos 4 caracteres');
        return;
      }
      
      console.log('Enviando datos para crear sala:', JSON.stringify(nuevaSala));
      console.log('URL de la petición:', '/api/salas/crear');
      console.log('Token usado:', token.substring(0, 15) + '...');
      
      const response = await fetch('/api/salas/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        },
        body: JSON.stringify(nuevaSala),
      });
  
      console.log('Respuesta recibida. Status:', response.status);
      console.log('Respuesta headers:', response.headers);
      
      // Si la respuesta no es 2xx, lanzar error
      if (!response.ok) {
        const contentType = response.headers.get("content-type");

        let errorMessage = `Error del servidor: ${response.status}`;
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error("Respuesta de error no-JSON:", errorText);
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      
      // Solo llegar aquí si la respuesta es exitosa (2xx)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('La respuesta no es JSON:', contentType);
        throw new Error('La respuesta del servidor no es JSON');
      }
      
      const data = await response.json();
      console.log('Datos de respuesta:', data);
      
      if (!data.codigo_sala) {
        throw new Error('Respuesta incompleta del servidor');
      }
  
      // ✅ JOIN SOCKET ROOM FOR LOBBY NOTIFICATIONS AFTER CREATING ROOM
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[SalasPage] Uniéndose a sala de lobby por socket después de crear: ${data.codigo_sala}`);
        socketRef.current.emit('unirse_sala_lobby', data.codigo_sala);
      }
  
      setShowModal(false);
      setWaitingForPlayers(data.codigo_sala);
      // ✅ Don't navigate immediately - wait for iniciar_redireccion_juego event
      // The event listener above will handle the navigation when the room is full
      console.log(`[SalasPage] Sala creada: ${data.codigo_sala}. Esperando a que se una otro jugador...`);
    } catch (error: any) {
      console.error('Error al crear sala:', error);
      setError(error.message || 'Error al crear la sala');
    }
  };

  // Función para unirse a una sala
  const unirseASala = async (sala: Sala) => {
    try {
      setError(null);
      
      // Si es una sala privada, mostrar el modal para ingresar código
      if (sala.tipo === 'privada') {
        setSalaSeleccionada(sala.codigo_sala);
        setShowJoinPrivateModal(true);
        return;
      }
      
      // ✅ JOIN SOCKET ROOM FOR LOBBY NOTIFICATIONS FIRST
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[SalasPage] Uniéndose a sala de lobby por socket ANTES de la API: ${sala.codigo_sala}`);
        socketRef.current.emit('unirse_sala_lobby', sala.codigo_sala);
      }
      
      // Si es una sala pública, unirse directamente
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/salas/unirse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ codigo_sala: sala.codigo_sala }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al unirse a la sala');
      }

      const data = await response.json();
      console.log('[SalasPage] Respuesta al unirse a sala:', data);
      
      // Check if the game has been started (room is now full)
      if (data.juego_iniciado) {
        console.log('[SalasPage] Partida iniciada, navegando a página de juego');
        // Game has started - navigate immediately
        navigate(`/online-game-page/${sala.codigo_sala}`);
      } else {
        // Still waiting for more players - navigate to game page to wait
        console.log('[SalasPage] Esperando más jugadores, navegando a página de juego');
        navigate(`/online-game-page/${sala.codigo_sala}`);
      }
    } catch (error: any) {
      console.error('Error al unirse a la sala:', error);
      setError(error.message || 'Error al unirse a la sala');
    }
  };

  // Función para unirse a una sala privada con código específico desde el modal
  const unirseASalaPrivada = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Si estamos usando el modal para unirse a una sala específica
      if (salaSeleccionada) {
        if (!codigoPrivado || codigoPrivado.length < 4) {
          setError('Por favor, introduce un código de acceso válido');
          return;
        }

        // ✅ JOIN SOCKET ROOM FOR LOBBY NOTIFICATIONS FIRST
        if (socketRef.current && socketRef.current.connected && salaSeleccionada) {
          console.log(`[SalasPage] Uniéndose a sala de lobby por socket ANTES de la API: ${salaSeleccionada}`);
          socketRef.current.emit('unirse_sala_lobby', salaSeleccionada);
        }

        const token = localStorage.getItem('token');
        // Unirse a una sala específica con código
        const response = await fetch(`/api/salas/unirse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            codigo_sala: salaSeleccionada,
            codigo_acceso: codigoPrivado 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Código inválido o sala llena');
        }

        const data = await response.json();
        console.log('[SalasPage] Respuesta al unirse a sala privada específica:', data);

        setShowJoinPrivateModal(false);
        setCodigoPrivado('');
        setSalaSeleccionada(null);
        
        // Check if the game has been started (room is now full)
        if (data.partida_iniciada) {
          console.log('[SalasPage] Partida iniciada, navegando a página de juego');
        } else {
          console.log('[SalasPage] Esperando más jugadores, navegando a página de juego');
        }
        navigate(`/online-game-page/${salaSeleccionada}`);
      } else {
        // Unirse a través de código sin conocer la sala
        if (!codigoPrivado || codigoPrivado.length < 4) {
          setError('Por favor, introduce un código de acceso válido');
          return;
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/salas/unirse-privada`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ codigo_acceso: codigoPrivado }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Código inválido o sala llena');
        }

        const data = await response.json();
        console.log('[SalasPage] Respuesta al unirse con código privado:', data);
        
        // ✅ JOIN SOCKET ROOM FOR LOBBY NOTIFICATIONS  
        if (socketRef.current && socketRef.current.connected && data.codigo_sala) {
          console.log(`[SalasPage] Uniéndose a sala de lobby por socket: ${data.codigo_sala}`);
          socketRef.current.emit('unirse_sala_lobby', data.codigo_sala);
        }
        
        setShowJoinPrivateModal(false);
        setCodigoPrivado('');
        
        // Check if the game has been started (room is now full)
        if (data.partida_iniciada) {
          console.log('[SalasPage] Partida iniciada, navegando a página de juego');
        } else {
          console.log('[SalasPage] Esperando más jugadores, navegando a página de juego');
        }
        navigate(`/online-game-page/${data.codigo_sala}`);
      }
    } catch (error: any) {
      console.error('Error al unirse a la sala privada:', error);
      setError(error.message || 'Error al unirse a la sala privada');
    }
  };

  // Generar código aleatorio para salas privadas
  const generarCodigoAleatorio = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < 6; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    setNuevaSala({
      ...nuevaSala,
      codigo_acceso: resultado
    });
  };

  // Generar enlace de invitación
  const generarEnlaceInvitacion = async (codigoSala: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/salas/generar-link/${codigoSala}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEnlaceInvitacion(data.enlace_invitacion);
        setShowLinkModal(true);
      } else {
        const error = await response.json();
        setError(error.error || 'Error al generar enlace');
      }
    } catch (error) {
      console.error('Error al generar enlace:', error);
      setError('Error al generar enlace de invitación');
    }
  };

  // Copiar enlace al portapapeles
  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlaceInvitacion);
      // Mostrar confirmación temporal
      const originalText = enlaceInvitacion;
      setEnlaceInvitacion('¡Enlace copiado!');
      setTimeout(() => {
        setEnlaceInvitacion(originalText);
      }, 2000);
    } catch (error) {
      console.error('Error al copiar enlace:', error);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = enlaceInvitacion;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      const originalText = enlaceInvitacion;
      setEnlaceInvitacion('¡Enlace copiado!');
      setTimeout(() => {
        setEnlaceInvitacion(originalText);
      }, 2000);
    }
  };

  // Formatear tiempo restante
  const formatearTiempoRestante = (tiempoExpiracion: string | null) => {
    if (!tiempoExpiracion) return 'Sin límite';
    
    const ahora = new Date();
    const expiracion = new Date(tiempoExpiracion);
    const diferencia = expiracion.getTime() - ahora.getTime();
    
    if (diferencia <= 0) return 'Expirada';
    
    const minutos = Math.floor(diferencia / 60000);
    const segundos = Math.floor((diferencia % 60000) / 1000);
    
    return `${minutos}m ${segundos}s`;
  };

  // Determinar si una sala está llena
  const salaEstaLlena = (sala: Sala) => {
    return sala.jugadores_actuales >= sala.max_jugadores;
  };

  // Cambiar filtro
  const cambiarFiltro = () => {
    const filtros: ('todas' | 'publicas' | 'privadas')[] = ['todas', 'publicas', 'privadas'];
    const indiceActual = filtros.indexOf(filtro);
    const siguienteFiltro = filtros[(indiceActual + 1) % filtros.length];
    setFiltro(siguienteFiltro);
    setPaginaActual(1); // Resetear a la primera página al cambiar filtro
  };

  // Funciones de paginación
  const irAPagina = (numeroPagina: number) => {
    setPaginaActual(numeroPagina);
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const abrirModalUnirseConCodigo = () => {
    setSalaSeleccionada(null); // No estamos usando una sala específica
    setCodigoPrivado(''); // Limpiar código anterior
    setShowJoinPrivateModal(true);
  };

  return (
    <div className="salas-container">
      <Header />
      <div className="salas-content">
        <div className="salas-header">
          <h1>Salas Disponibles</h1>
          <div className="header-actions">
            {!isAnonymous && (
              <>
                <button 
                  className="filter-button"
                  onClick={cambiarFiltro}
                  title={`Filtro actual: ${filtro === 'todas' ? 'Todas' : filtro === 'publicas' ? 'Públicas' : 'Privadas'}`}
                >
                  <IoFilterOutline />
                  {filtro === 'todas' ? 'Todas' : filtro === 'publicas' ? 'Públicas' : 'Privadas'}
                </button>
                <button 
                  className="bg-black"
                  onClick={fetchSalas}
                  title="Actualizar lista de salas"
                >
                  <IoRefreshOutline />
                </button>
                <button 
                  className="create-room-button"
                  onClick={() => setShowModal(true)}
                >
                  <IoAddCircleOutline /> Crear Sala
                </button>
              </>
            )}
            {isAnonymous && (
              <button 
                className="bg-black"
                onClick={fetchSalas}
                title="Actualizar lista de salas"
              >
                <IoRefreshOutline />
              </button>
            )}
          </div>
        </div>
        
        <div className="join-private-section">
      {!isAnonymous && (
        <button 
          className="join-private-button"
          onClick={abrirModalUnirseConCodigo}
        >
          <IoLockClosed /> Unirse con código
        </button>
      )}
    </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {waitingForPlayers && (
          <div className="waiting-message">
            <div className="waiting-content">
              <div className="spinner"></div>
              <p>Sala <strong>{waitingForPlayers}</strong> creada exitosamente</p>
              <p>Esperando a que se una otro jugador...</p>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="loading">Cargando salas...</div>
        ) : salas.length > 0 ? (
          <div className="salas-list">
            {salas.map((sala) => (
              <div 
                key={sala.codigo_sala} 
                className={`sala-card ${salaEstaLlena(sala) ? 'sala-llena' : ''}`}
              >
                <div className="sala-header">
                  <div className="sala-tipo">
                    {sala.tipo === 'publica' ? (
                      <><IoLockOpen className="icon-public" /> Pública</>
                    ) : (
                      <><IoLockClosed className="icon-private" /> Privada</>
                    )}
                  </div>
                  <div className="sala-codigo">{sala.codigo_sala}</div>
                </div>
                
                <div className="sala-info">
                  <div className="sala-jugadores">
                    Jugadores: {sala.jugadores_actuales}/{sala.max_jugadores}
                  </div>
                  <div className="sala-puntos">
                    A {sala.puntos_victoria} puntos
                  </div>
                  <div className="sala-creador">
                    Creador: {sala.creador || 'Desconocido'}
                  </div>
                  {/* Elimina esta condición para que aparezca en todas las salas */}
                  {sala.tiempo_expiracion && (
                    <div className="sala-expiracion">
                      Expira en: {formatearTiempoRestante(sala.tiempo_expiracion)}
                    </div>
                  )}
                </div>
                
                <div className="sala-actions">
                  <button 
                    className="unirse-button"
                    onClick={() => unirseASala(sala)}
                    disabled={salaEstaLlena(sala)}
                  >
                    {salaEstaLlena(sala) ? 'Sala Llena' : sala.tipo === 'privada' ? 'Ingresar código' : 'Unirse'}
                  </button>
                  
                  <button 
                    className="generar-link-button"
                    onClick={() => generarEnlaceInvitacion(sala.codigo_sala)}
                    title="Generar enlace para invitar amigos"
                  >
                    🔗 Enlace
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-salas">
            No hay salas disponibles. ¡Crea una nueva!
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="paginacion">
            <div className="paginacion-info">
              Página {paginaActual} de {totalPaginas} • {totalSalas} salas disponibles
            </div>
            <div className="paginacion-controles">
              <button 
                className="paginacion-btn"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                ← Anterior
              </button>
              
              <div className="paginacion-numeros">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let numeroPagina;
                  if (totalPaginas <= 5) {
                    numeroPagina = i + 1;
                  } else if (paginaActual <= 3) {
                    numeroPagina = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    numeroPagina = totalPaginas - 4 + i;
                  } else {
                    numeroPagina = paginaActual - 2 + i;
                  }
                  
                  return (
                    <button
                      key={numeroPagina}
                      className={`paginacion-numero ${paginaActual === numeroPagina ? 'activa' : ''}`}
                      onClick={() => irAPagina(numeroPagina)}
                    >
                      {numeroPagina}
                    </button>
                  );
                })}
              </div>
              
              <button 
                className="paginacion-btn"
                onClick={paginaSiguiente}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear sala - Solo para usuarios registrados */}
      {showModal && !isAnonymous && (
      <div className="modal-backdrop" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2>Crear Nueva Sala</h2>
          <form onSubmit={crearSala}>
            <div className="form-group">
              <label htmlFor="tipo">Tipo de Sala:</label>
              <select 
                id="tipo" 
                name="tipo" 
                value={nuevaSala.tipo}
                onChange={handleInputChange}
                disabled={isAnonymous} // Deshabilitar si es anónimo
              >
                <option value="publica">Pública</option>
                <option value="privada" disabled={isAnonymous}>Privada {isAnonymous && '(solo usuarios registrados)'}</option>
              </select>
              {isAnonymous && (
                <small className="text-warning">Los usuarios anónimos solo pueden crear salas públicas</small>
              )}
            </div>
              
              {nuevaSala.tipo === 'privada' && (
                <div className="form-group">
                  <label htmlFor="codigo_acceso">Código de Acceso:</label>
                  <div className="codigo-input-group">
                    <input 
                      type="text" 
                      id="codigo_acceso" 
                      name="codigo_acceso"
                      value={nuevaSala.codigo_acceso}
                      onChange={handleInputChange}
                      placeholder="Código de 6 caracteres"
                      maxLength={6}
                      required
                    />
                    <button 
                      type="button" 
                      className="generar-codigo-button"
                      onClick={generarCodigoAleatorio}
                    >
                      Generar
                    </button>
                  </div>
                  <small>Las salas privadas expirarán después de 5 minutos</small>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="puntos_victoria">Puntos para ganar:</label>
                <select 
                  id="puntos_victoria" 
                  name="puntos_victoria"
                  value={nuevaSala.puntos_victoria}
                  onChange={handleInputChange}
                  required
                >
                  <option value="15">15 puntos</option>
                  <option value="30">30 puntos</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="max_jugadores">Número máximo de jugadores:</label>
                <select 
                  id="max_jugadores" 
                  name="max_jugadores"
                  value={nuevaSala.max_jugadores}
                  onChange={handleInputChange}
                  required
                >
                  <option value="2">2 jugadores</option>
                  <option value="4">4 jugadores</option>
                  <option value="6">6 jugadores</option>
                </select>
              </div>
              
              {error && <div className="form-error">{error}</div>}
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="create-button">
                  Crear Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para unirse a sala privada */}
      {showJoinPrivateModal && (
        <div className="modal-backdrop" onClick={() => setShowJoinPrivateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{salaSeleccionada ? 'Ingresar Código de Acceso' : 'Unirse a Sala Privada'}</h2>
            <form onSubmit={unirseASalaPrivada}>
              <div className="form-group">
                <label htmlFor="codigo_privado">Código de Acceso:</label>
                <input 
                  type="text" 
                  id="codigo_privado" 
                  value={codigoPrivado}
                  onChange={(e) => setCodigoPrivado(e.target.value)}
                  placeholder="Ingresa el código de acceso"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              
              {error && <div className="form-error">{error}</div>}
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => {
                  setShowJoinPrivateModal(false);
                  setSalaSeleccionada(null);
                  setCodigoPrivado('');
                }}>
                  Cancelar
                </button>
                <button type="submit" className="join-button">
                  {salaSeleccionada ? 'Ingresar' : 'Unirse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para enlace de invitación */}
      {showLinkModal && (
        <div className="modal-backdrop" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content enlace-modal" onClick={e => e.stopPropagation()}>
            <h2>Enlace de Invitación</h2>
            <div className="enlace-content">
              <input 
                type="text" 
                value={enlaceInvitacion}
                readOnly
                className="enlace-input"
              />
              <button 
                className="copy-link-button"
                onClick={copiarEnlace}
                title="Copiar enlace al portapapeles"
              >
                Copiar Enlace
              </button>
            </div>
            <p>Comparte este enlace con tus amigos para que se unan a la sala.</p>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setShowLinkModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalasPage;