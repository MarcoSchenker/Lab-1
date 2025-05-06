import React, { useState, useEffect } from "react";
import "./LeaderBoardPage.css";
import api from "../services/api";
import { FaMagnifyingGlass, FaTrophy } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface Player {
  nombre_usuario: string;
  elo: number;
  victorias: number;
  derrotas: number;
  partidas_jugadas: number;
  rank?: number; // Posición en el ranking
}

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

const LeaderBoardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener el ranking de jugadores
        const response = await api.get('/ranking');
        
        // Añadir la posición en el ranking a cada jugador
        const rankedPlayers = response.data.map((player: Player, index: number) => ({
          ...player,
          rank: index + 1
        }));
        
        setPlayers(rankedPlayers);
      } catch (err: any) {
        setError(err.message || "Error al cargar el ranking");
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  // Función para determinar el color de la medalla según la posición
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "#cd7f32"; // Bronce
    return "transparent";
  };

  return (
    <div className="LeaderBoardPage">
      <div className="homeIcon" onClick={() => navigate("/dashboard")}>
        <FaHome title="Volver al Dashboard" />
      </div>
      
      <div className="LeaderBoardContainer">
        <div className="rankingHolder">
          <h1 className="rankingTitle">Ranking de Jugadores</h1>
          <SearchBar
            value={searchTerm}
            searchHandler={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar jugadores..."
          />
          <div className="rankingData">
            {loading ? (
              <p>Cargando ranking...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : (
              <table className="rankingTable">
                <thead>
                  <tr>
                    <th>Posición</th>
                    <th>Jugador</th>
                    <th>ELO</th>
                    <th>Victorias</th>
                    <th>Derrotas</th>
                    <th>Partidas</th>
                  </tr>
                </thead>
                <tbody>
                  {players
                    .filter((player) => 
                      player.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((player) => (
                      <tr key={player.nombre_usuario} className="rankingItem">
                        <td>
                          <div className="rankPosition" style={{ backgroundColor: getMedalColor(player.rank || 0) }}>
                            {player.rank}
                            {player.rank && player.rank <= 3 && (
                              <FaTrophy className="trophyIcon" />
                            )}
                          </div>
                        </td>
                        <td>{player.nombre_usuario}</td>
                        <td>{player.elo}</td>
                        <td>{player.victorias}</td>
                        <td>{player.derrotas}</td>
                        <td>{player.partidas_jugadas}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderBoardPage;