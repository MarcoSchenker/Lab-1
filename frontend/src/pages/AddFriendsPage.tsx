import React, { useState, useEffect, ChangeEventHandler } from "react";
import "./AddFriendsPage.css";
import api from "../services/api"; // Importa el cliente API configurado

interface SearchTermProps {
  value: string;
  searchHandler: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
}

const SearchBar: React.FC<SearchTermProps> = (props) => {
  return (
    <input
      type="search"
      className="searchBar"
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.searchHandler}
    />
  );
};

const AddFriendsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener usuarios desde la base de datos
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Realiza una solicitud GET al backend para obtener los usuarios
        const response = await api.get("/usuarios"); // Cambia la ruta si es necesario
        setUsers(response.data.map((user: { nombre_usuario: string }) => user.nombre_usuario));
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboardContainer">
      <div className="searchHolder">
        <h1 className="searchTitle">Buscar Amigos</h1>
        <SearchBar
          value={searchTerm}
          searchHandler={handleSearchChange}
          placeholder="Buscar usuarios..."
        />
        <div className="searchData">
          {loading ? (
            <p>Cargando usuarios...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <ul>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <li key={index} className="searchItem">
                    {user}
                  </li>
                ))
              ) : (
                <li className="searchItem">No se encontraron usuarios</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFriendsPage;