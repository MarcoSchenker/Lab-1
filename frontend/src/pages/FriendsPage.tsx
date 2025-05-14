import React, { useState, useEffect } from "react";
import "./FriendsPage.css";
import { FaUserPlus } from "react-icons/fa";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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

  return (
    <div className="FriendsPage">
      <div className="modern-friends-header">
        <motion.button
          className="volver-btn"
          onClick={() => navigate("/dashboard")}
          whileHover={{ scale: 1.07 }}
        >
          Volver
        </motion.button>
        <button
          className="friendRequestsButton"
          onClick={() => navigate("/friends-request")}
        >
          Solicitudes de Amistad
          {pendingRequests > 0 && (
            <span className="notification-badge">{pendingRequests}</span>
          )}
        </button>
        <div
          className="addFriendsIcon"
          onClick={() => navigate("/agregar-amigo")}
          title="Agregar Amigos"
        >
          <FaUserPlus />
        </div>
      </div>
      <div className="FriendsContainer glass-card">
        <h1 className="friendsTitle">Mis Amigos</h1>
        <div className="friendsData">
          {loading ? (
            <p>Cargando amigos...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : friends.length > 0 ? (
            <ul>
              {friends.map((friend, index) => (
                <li
                  key={index}
                  className="friendItem glass-list-item"
                  onClick={() => navigate(`/user/${friend.usuario_id}`)}
                >
                  <img
                    src={`${friend.foto_perfil}?t=${new Date().getTime()}`}
                    alt={`${friend.nombre_usuario} Foto de Perfil`}
                    className="friendProfilePicture"
                  />
                  <span className="friendName">{friend.nombre_usuario}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="friendsText">
              <p>No tienes amigos agregados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;