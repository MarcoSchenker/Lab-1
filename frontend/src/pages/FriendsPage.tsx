import React, { useState, useEffect } from "react";
import "./FriendsPage.css";
import { FaHome, FaUserPlus } from "react-icons/fa"; // Íconos para la casita y agregar amigos
import api from "../services/api";
import { useNavigate } from "react-router-dom";

interface Friend {
  usuario_id: number;
  nombre_usuario: string;
  foto_perfil: string | null; // URL de la foto de perfil
}

const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loggedInUser = localStorage.getItem("username") || ""; // Usuario logueado

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener la lista de amigos del usuario
        const response = await api.get(`/amigos?nombre_usuario=${loggedInUser}`);
        setFriends(
          response.data.map((friend: { usuario_id: number, nombre_usuario: string; foto_perfil: string | null }) => ({
            usuario_id: friend.usuario_id,
            nombre_usuario: friend.nombre_usuario,
            foto_perfil: friend.foto_perfil,
          }))
        );
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [loggedInUser]);

  return (
    <div className="FriendsPage">
      {/* Ícono de casita para volver al dashboard */}
      <div className="homeIcon" onClick={() => navigate("/dashboard")}>
        <FaHome title="Volver al Dashboard" />
      </div>
      <div className="topRightButton">
        <button
        className="friendRequestsButton"
        onClick={() => navigate("/friends-request")}
        >
          Solicitudes de Amistad
        </button>
      </div>
    <div className="flechita" onClick={() => navigate("/dashboard")}>
      <img src= "/flecha.png"/>
    </div>

      {/* Ícono para ir a AddFriendsPage */}
      <div className="addFriendsIcon" onClick={() => navigate("/agregar-amigo")}>
        <FaUserPlus title="Agregar Amigos" />
      </div>

      <div className="FriendsContainer">
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
                className="friendItem"
                onClick={() => navigate(`/user/${friend.usuario_id}`)} // Redirige al perfil del amigo
                >
                  <img
                    src={`${friend.foto_perfil}?t=${new Date().getTime()}`} // Agrega un parámetro único para evitar caché
                    alt={`${friend.nombre_usuario} Foto de Perfil`}
                    className="friendProfilePicture"
                  />
                  <span className="friendName">{friend.nombre_usuario}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No tienes amigos agregados.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;