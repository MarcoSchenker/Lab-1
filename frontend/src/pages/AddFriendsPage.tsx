import React, { useState, useEffect } from "react";
import "./AddFriendsPage.css";
import api from "../services/api";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { FaUserPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface SearchTermProps {
  value: string;
  searchHandler: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
}

const SearchBar: React.FC<SearchTermProps> = (props) => (
  <div className="searchBarContainer">
    <FaMagnifyingGlass className="searchIcon" />
    <input
      type="search"
      className="searchBar"
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.searchHandler}
    />
  </div>
);

const AddFriendsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const navigate = useNavigate();

  const loggedInUser = localStorage.getItem("username") || "";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/usuarios-disponibles?nombre_usuario=${loggedInUser}`);
        setUsers(response.data.map((user: { nombre_usuario: string }) => user.nombre_usuario));
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

  const handleSendFriendRequest = async (friendUsername: string) => {
    try {
      const from = localStorage.getItem('username');
      if (!from) {
        alert('Error: No se encontró el usuario logueado.');
        return;
      }
      await api.post('/amigos', { from, to: friendUsername });
      setUsers(users.filter((user) => user !== friendUsername));
    } catch (err) {
      alert('Error al enviar solicitud de amistad');
    }
  };

return (
  <div className="AddFriendsPage">
    <motion.button
      className="volver-btn"
      onClick={() => navigate("/friends")}
      whileHover={{ scale: 1.07 }}
      style={{ position: "absolute", top: 30, left: 30, zIndex: 2 }}
    >
      Volver
    </motion.button>
    <div className="topRight">
      <button
        className="friendRequestsButton"
        onClick={() => navigate("/friends-request")}
      >
        Solicitudes de Amistad
        {pendingRequests > 0 && (
          <span className="notification-badge">{pendingRequests}</span>
        )}
      </button>
    </div>
    <div className="AddFriendsContainer glass-card">
      <div className="add-friends-search-box">
        <h1 className="searchTitle">Buscar Amigos</h1>
        <SearchBar
          value={searchTerm}
          searchHandler={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar usuarios..."
        />
          <div className="searchData">
            {loading ? (
              <p>Cargando usuarios...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : (
              <ul>
                {users
                  .filter((user) => user.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((user, index) => (
                    <li key={index} className="searchItem glass-list-item">
                      <span className="userName">{user}</span>
                      <FaUserPlus
                        className="addFriendIcon"
                        title="Envíar solicitud de amistad"
                        onClick={() => handleSendFriendRequest(user)}
                      />
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFriendsPage;