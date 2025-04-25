import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/HeaderDashboard';
import api from '../services/api';

interface Stats {
  victorias: number;
  derrotas: number;
  partidas_jugadas: number;
  elo: number;
  username: string;
}

const StatsPage: React.FC = () => {
  const { usuario_id } = useParams<{ usuario_id: string }>();
  console.log('Usuario ID:', usuario_id);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      console.log(`Intentando obtener estadísticas para usuario_id: ${usuario_id}`);
      console.log(`URL: /estadisticas/${usuario_id}`);
      try {
        const response = await api.get(`/estadisticas/${usuario_id}`);
        console.log('Respuesta del backend:', response.data); 
        setStats(response.data);
      } catch (error) {
        console.error('Error al obtener estadísticas:', error);
      }
    };
    fetchStats();
  }, [usuario_id]);
  
  useEffect(() => {
    console.log('Estado de stats actualizado:', stats);
  }, [stats]);

  if (!stats) return <div style={{ textAlign: 'center', marginTop: '50px' }}>No hay estadísticas disponibles para este usuario.</div>;

  return (
    <div>
      <Header /> 
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        textAlign: 'center' 
      }}>
        <h2>Estadísticas de {stats.username}</h2>
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