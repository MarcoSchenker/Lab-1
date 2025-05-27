import React, { useState, useEffect } from "react";
import "./FriendRequestPage.css";
import api from "../services/api";
import { FaArrowLeft } from "react-icons/fa6";
import { FaCheck, FaTimes, FaUserFriends } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const FriendRequestPage: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Nuevos estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 5; // 5 solicitudes por página
  
  const loggedInUser = localStorage.getItem("username") || "";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/friend-requests?to=${loggedInUser}`);
        setFriendRequests(response.data);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchFriendRequests();
  }, [loggedInUser]);

  // Cálculos para paginación
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = friendRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(friendRequests.length / requestsPerPage);

  // Funciones para navegación entre páginas
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.post(`/friend-requests/${requestId}/accept`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error("Error al aceptar solicitud:", err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.delete(`/friend-requests/${requestId}/reject`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error("Error al rechazar solicitud:", err);
    }
  };

  return (
    <div className="FriendRequestPage">
      <div className="FriendRequestContainer glass-card">
        <div className="header-section">
          <motion.button
            className="action-button back-button"
            onClick={() => navigate("/friends")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FaArrowLeft />
            <span>Volver</span>
          </motion.button>

          <motion.h1 
            className="requestTitle"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Solicitudes de Amistad
          </motion.h1>

          <div style={{ width: "92px" }}></div> {/* Espacio para balance visual */}
        </div>
        
        <div className="request-content-box">
          <div className="request-results-container">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando solicitudes...</p>
              </div>
            ) : error ? (
              <p className="error">{error}</p>
            ) : friendRequests.length > 0 ? (
              <>
                <AnimatePresence mode="wait">
                  <ul className="friendRequestList">
                    {currentRequests.map((request, index) => (
                      <motion.li 
                        key={request.id} 
                        className="glass-list-item"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 100
                        }}
                        whileHover={{ 
                          scale: 1.02, 
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
                        }}
                      >
                        <div className="user-info">
                          <div className="friend-avatar">
                            <img
                              src={request.foto_perfil}
                              alt={`${request.from_user}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/default-avatar.png";
                              }}
                            />
                          </div>
                          <span className="userName">{request.from_user}</span>
                        </div>
                        <div className="action-icons">
                          <motion.div
                            className="acceptIconContainer"
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            <FaCheck
                              className="acceptIcon"
                              title="Aceptar solicitud"
                            />
                          </motion.div>
                          <motion.div
                            className="rejectIconContainer"
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <FaTimes
                              className="rejectIcon"
                              title="Rechazar solicitud"
                            />
                          </motion.div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
                
                {/* Controles de paginación */}
                {friendRequests.length > requestsPerPage && (
                  <motion.div 
                    className="pagination-controls"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <motion.button 
                      className={`page-button ${currentPage === 1 ? 'disabled' : ''}`}
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                    >
                      Anterior
                    </motion.button>
                    <span className="page-indicator">
                      Página {currentPage} de {totalPages}
                    </span>
                    <motion.button 
                      className={`page-button ${currentPage === totalPages ? 'disabled' : ''}`}
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
                    >
                      Siguiente
                    </motion.button>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div 
                className="empty-state"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FaUserFriends className="empty-icon" />
                <p>No tienes solicitudes pendientes</p>
                <p className="suggestion">Las solicitudes de amistad aparecerán aquí</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequestPage;