import React, { useState, useEffect, useRef } from "react";
import "./FriendsPage.css";
import { FaUserPlus, FaUserFriends, FaBell } from "react-icons/fa";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/HeaderDashboard";

interface Friend {
  usuario_id: number;
  nombre_usuario: string;
  foto_perfil: string | null;
}

const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const friendsPerPage = 4;
  
  const friendsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const loggedInUser = localStorage.getItem("username") || "";

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/amigos?nombre_usuario=${loggedInUser}`);
        setFriends(response.data.amigos || []);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    const fetchPendingRequests = async () => {
      try {
        const response = await api.get(`/friend-requests?to=${loggedInUser}`);
        setPendingRequests(response.data.length);
      } catch (err) {}
    };
    fetchFriends();
    fetchPendingRequests();
  }, [loggedInUser]);

  const filteredFriends = friends.filter(friend => 
    friend.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastFriend = currentPage * friendsPerPage;
  const indexOfFirstFriend = indexOfLastFriend - friendsPerPage;
  const currentFriends = filteredFriends.slice(indexOfFirstFriend, indexOfLastFriend);
  const totalPages = Math.ceil(filteredFriends.length / friendsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      if (friendsContainerRef.current) {
        friendsContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      if (friendsContainerRef.current) {
        friendsContainerRef.current.scrollTop = 0;
      }
    }
  };

  return (
    <div className="friends-page-modern">
      <Header />
      
      <div className="friends-page-content">
        <div className="friends-card">
          <div className="friends-card-header">
            <h1>Mis Amigos</h1>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Buscar amigos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="buttons-row">
            <motion.button
              className="action-button back-button"
              onClick={() => navigate("/dashboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Volver
            </motion.button>
            
            <motion.button
              className="action-button requests-button"
              onClick={() => navigate("/friends-request")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaBell className="button-icon" />
              Solicitudes
              {pendingRequests > 0 && (
                <span className="notification-badge">{pendingRequests}</span>
              )}
            </motion.button>
            
            <motion.button
              className="action-button add-button"
              onClick={() => navigate("/agregar-amigo")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaUserPlus className="button-icon" />
              Agregar Amigos
            </motion.button>
          </div>
          
          <div className="friends-list-container" ref={friendsContainerRef}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando tus amigos...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="friends-grid">
                {currentFriends.map((friend) => (
                  <motion.div
                    key={friend.usuario_id}
                    className="friend-card"
                    onClick={() => navigate(`/user/${friend.usuario_id}`)}
                    whileHover={{ 
                      scale: 1.03,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)" 
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="friend-avatar">
                      <img
                        src={`${friend.foto_perfil}?t=${new Date().getTime()}`}
                        alt={`${friend.nombre_usuario}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                      />
                    </div>
                    <div className="friend-info">
                      <h3>{friend.nombre_usuario}</h3>
                      <div className="friend-actions">
                        <span>Ver perfil</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FaUserFriends className="empty-icon" />
                <p>No tienes amigos agregados.</p>
                <p className="suggestion">¡Busca nuevos amigos para jugar juntos!</p>
              </div>
            )}
          </div>
          
          {filteredFriends.length > friendsPerPage && (
            <div className="pagination-controls">
              <button 
                className={`page-button ${currentPage === 1 ? 'disabled' : ''}`}
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span className="page-indicator">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                className={`page-button ${currentPage === totalPages ? 'disabled' : ''}`}
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;