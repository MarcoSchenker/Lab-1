import React, { useState, useEffect } from "react";
import "./AddFriendsPage.css";
import api from "../services/api";
import { FaArrowLeft } from "react-icons/fa6";
import { FaUserFriends, FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuMailPlus } from "react-icons/lu";


const AddFriendsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 4;
  
  const navigate = useNavigate();
  const loggedInUser = localStorage.getItem("username") || "";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/usuarios-disponibles?nombre_usuario=${loggedInUser}`);
        setUsers(response.data || []);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
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
    fetchUsers();
    fetchPendingRequests();
  }, [loggedInUser]);

  const filteredUsers = users.filter((user) => 
    user.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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

  const handleSendFriendRequest = async (friendUsername: string) => {
    try {
      const from = localStorage.getItem('username');
      if (!from) {
        alert('Error: No se encontró el usuario logueado.');
        return;
      }
      await api.post('/amigos', { from, to: friendUsername });
      setUsers(users.filter((user) => user.nombre_usuario !== friendUsername));
    } catch (err) {
      alert('Error al enviar solicitud de amistad');
    }
  };

  return (
    <div className="AddFriendsPage">
      <div className="AddFriendsContainer glass-card">
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
            className="searchTitle"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Buscar Amigos
          </motion.h1>

          <motion.button
            className="action-button requests-button"
            onClick={() => navigate("/friends-request")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span>Solicitudes</span>
            <FaBell />
            {pendingRequests > 0 && (
              <span className="notification-badge">{pendingRequests}</span>
            )}
          </motion.button>
        </div>
        
        <div className="add-friends-search-box">
          <motion.div 
            className="search-bar"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <input 
              type="text" 
              placeholder="Buscar usuarios..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>
          
          <div className="search-results-container">
            <div className="searchData">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Buscando usuarios...</p>
                </div>
              ) : error ? (
                <p className="error">{error}</p>
              ) : filteredUsers.length > 0 ? (
                <>
                  <AnimatePresence>
                    <ul>
                      {currentUsers.map((user, index) => (
                        <motion.li 
                          key={index} 
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
                                src={user.foto_perfil}
                                alt={`${user.nombre_usuario}`}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/default-avatar.png";
                                }}
                              />
                            </div>
                            <span className="userName">{user.nombre_usuario}</span>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            whileTap={{ scale: 0.9, rotate: -5 }}
                            className="addFriendIconContainer" 
                            onClick={() => handleSendFriendRequest(user.nombre_usuario)} // Mover aquí el onClick

                          >
                            <LuMailPlus 
                              className="addFriendIcon"
                              title="Enviar solicitud de amistad"
                            />
                          </motion.div>
                        </motion.li>
                      ))}
                    </ul>
                  </AnimatePresence>
                
                {filteredUsers.length > usersPerPage && (
                  <div className="pagination-controls">
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
                  </div>
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
                  <p>No se encontraron usuarios con ese nombre.</p>
                  <p>Intenta con otro término de búsqueda.</p>
                </motion.div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
  );
};

export default AddFriendsPage;