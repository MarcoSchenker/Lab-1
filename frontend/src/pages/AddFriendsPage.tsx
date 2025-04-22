import React, { useState, useEffect } from "react";
import "./AddFriendsPage.css";
import api from "../services/api";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { FaUserPlus, FaHome } from "react-icons/fa"; // Ícono para agregar amigo
import { useNavigate } from "react-router-dom";

interface SearchTermProps {
  value: string;
  searchHandler: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
}

const SearchBar: React.FC<SearchTermProps> = (props) => {
  return (
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
};

const AddFriendsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loggedInUser = localStorage.getItem("username") || ""; // Usuario logueado
  console.log("Usuario logueado:", loggedInUser);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener usuarios disponibles para agregar
        const response = await api.get(`/usuarios-disponibles?nombre_usuario=${loggedInUser}`);
        setUsers(response.data.map((user: { nombre_usuario: string }) => user.nombre_usuario));
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [loggedInUser]);

  const handleSendFriendRequest = async (friendUsername: string) => {
    try {
      const from = localStorage.getItem('username'); // Usuario logueado
      if (!from) {
        alert('Error: No se encontró el usuario logueado.');
        return;
      }
  
      console.log(`Enviando solicitud de amistad: from=${from}, to=${friendUsername}`);
  
      await api.post('/amigos', { from, to: friendUsername });
      alert(`Solicitud de amistad enviada a ${friendUsername}`);
      setUsers(users.filter((user) => user !== friendUsername)); // Actualizar lista
    } catch (err) {
      console.error('Error al enviar solicitud de amistad:', err);
      alert('Error al enviar solicitud de amistad');
    }
  };

  return (
    <div className="AddFriendsPage">
    <div className="homeIcon" onClick={() => navigate("/dashboard")}>
      <FaHome title="Volver al Dashboard" />
    </div>
      {/* Botón de solicitudes de amistad */}
      <div className="topRightButton">
        <button
        className="friendRequestsButton"
        onClick={() => navigate("/friends-request")}
        >
          Solicitudes de Amistad
        </button>
      </div>
    <div className="AddFriendsContainer">
      <div className="searchHolder">
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
                  <li key={index} className="searchItem">
                    <span className="userName">{user}</span>
                    <FaUserPlus
                      className="addFriendIcon"
                      title="Agregar amigo"
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