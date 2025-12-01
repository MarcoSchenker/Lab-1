import React, { useState, useEffect } from "react";
import "./LeaderBoardPage.css";
import api from "../services/api";
import { FaMagnifyingGlass, FaTrophy, FaMedal } from "react-icons/fa6";
import { IoArrowBack } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

interface Player {
  id: number;
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
        // Filtrar jugadores con ELO > 0 y tomar solo los top 25
        const rankedPlayers = response.data
          .filter((player: Player) => player.elo > 0)
          .map((player: Player, index: number) => ({
            ...player,
            rank: index + 1
          }))
          .slice(0, 25); // Solo los 25 mejores
        
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
  
  // Función para determinar el icono según la posición
  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <FaTrophy className="trophyIcon" />;
    if (rank <= 10) return <FaMedal className="medalIcon" />;
    return null;
  };
  
  // Función para determinar el color de fondo de la fila
  const getRowClass = (rank: number) => {
    if (rank === 1) return "firstPlace";
    if (rank === 2) return "secondPlace";
    if (rank === 3) return "thirdPlace";
    return rank % 2 === 0 ? "evenRow" : "oddRow";
  };

  const top3 = players.slice(0, 3);

  return (
    <div className="LeaderBoardPage">
      <div className="LeaderBoardContainer">
        <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '15px', display: 'flex' }}>
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn-volver"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(5px)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <IoArrowBack /> Volver
          </button>
        </div>

        <div className="rankingHolder">
          <h1 className="rankingTitle">Ranking de Jugadores</h1>
          
          {!loading && !error && players.length > 0 && (
            <div className="podium-container" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', alignItems: 'flex-end', marginTop: '20px' }}>
              {/* 2nd Place */}
              {top3[1] && (
                <div className="podium-item second" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="podium-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#C0C0C0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: '#333' }}>🥈</div>
                  <div className="podium-name" style={{ marginTop: '10px', fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{top3[1].nombre_usuario}</div>
                  <div className="podium-elo" style={{ color: '#ddd', fontSize: '0.9em' }}>{top3[1].elo} ELO</div>
                  <div className="podium-bar" style={{ width: '60px', height: '100px', background: 'linear-gradient(to bottom, #C0C0C0, #808080)', marginTop: '10px', borderRadius: '8px 8px 0 0', opacity: 0.9 }}></div>
                </div>
              )}
              
              {/* 1st Place */}
              {top3[0] && (
                <div className="podium-item first" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                  <FaTrophy style={{ color: 'gold', fontSize: '40px', marginBottom: '10px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                  <div className="podium-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'gold', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', border: '4px solid white', boxShadow: '0 4px 15px rgba(255,215,0,0.5)', color: '#333' }}>🥇</div>
                  <div className="podium-name" style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '1.2em', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{top3[0].nombre_usuario}</div>
                  <div className="podium-elo" style={{ color: '#ddd', fontSize: '0.9em' }}>{top3[0].elo} ELO</div>
                  <div className="podium-bar" style={{ width: '80px', height: '140px', background: 'linear-gradient(to bottom, #FFD700, #DAA520)', marginTop: '10px', borderRadius: '8px 8px 0 0', opacity: 0.9 }}></div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="podium-item third" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="podium-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#cd7f32', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: '#333' }}>🥉</div>
                  <div className="podium-name" style={{ marginTop: '10px', fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{top3[2].nombre_usuario}</div>
                  <div className="podium-elo" style={{ color: '#ddd', fontSize: '0.9em' }}>{top3[2].elo} ELO</div>
                  <div className="podium-bar" style={{ width: '60px', height: '70px', background: 'linear-gradient(to bottom, #cd7f32, #8b4513)', marginTop: '10px', borderRadius: '8px 8px 0 0', opacity: 0.9 }}></div>
                </div>
              )}
            </div>
          )}

          <SearchBar
            value={searchTerm}
            searchHandler={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar jugadores..."
          />
          <div className="rankingData">
            {loading ? (
              <p className="loadingMessage">Cargando ranking...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : (
              <div className="tableContainer">
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
                        <tr 
                          key={player.nombre_usuario}
                          className={`rankingItem ${getRowClass(player.rank || 0)}`}
                          onClick={() => navigate(`/user/${player.id}`)}
                          style={{ cursor: "pointer" }} 
                      >
                          <td>
                            <div className="rankPosition" style={{ backgroundColor: getMedalColor(player.rank || 0) }}>
                              {player.rank}
                              {getRankIcon(player.rank || 0)}
                            </div>
                          </td>
                          <td className="playerName">{player.nombre_usuario}</td>
                          <td className="eloValue">{player.elo}</td>
                          <td>{player.victorias}</td>
                          <td>{player.derrotas}</td>
                          <td>{player.partidas_jugadas}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rankingFooter">
            Mostrando los 25 mejores jugadores
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderBoardPage;