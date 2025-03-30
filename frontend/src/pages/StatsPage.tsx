import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStats } from '../services/api';
import Header from '../components/Header';

interface Stats {
  victorias: number;
  derrotas: number;
  partidas_jugadas: number;
  elo: number;
}

const StatsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getStats(userId!);
        setStats(response.data);
      } catch (error) {
        console.error('Error al obtener estadísticas:', error);
      }
    };
    fetchStats();
  }, [userId]);

  if (!stats) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando estadísticas...</div>;

  return (
    <div>
      <Header /> {/* Agregamos el Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        textAlign: 'center' 
      }}>
        <h2>Estadísticas del Jugador</h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            width: '300px',
          }}
        >
          <p>Victorias: <strong>{stats.victorias}</strong></p>
          <p>Derrotas: <strong>{stats.derrotas}</strong></p>
          <p>Partidas Jugadas: <strong>{stats.partidas_jugadas}</strong></p>
          <p>ELO: <strong>{stats.elo}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;