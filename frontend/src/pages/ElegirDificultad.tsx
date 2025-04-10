// src/pages/ElegirDificultad.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ElegirDificultad.css';

const ElegirDificultad: React.FC = () => {
  const navigate = useNavigate();

  const seleccionarDificultad = async (dificultad: 'facil' | 'dificil') => {
    if (dificultad === 'dificil') {
      try {
        const ia = await import('../game/iaPro/ia'); // Importación dinámica de ia.js
        console.log('IA cargada para dificultad difícil:', ia);
      } catch (error) {
        console.error('Error al cargar la IA:', error);
      }
    }
    navigate(`/jugar-offline?dificultad=${dificultad}`);
  };

  return (
    <div className="elegir-dificultad-container">
      <h2>Elegí la dificultad</h2>
      <button onClick={() => seleccionarDificultad('facil')}>Fácil</button>
      <button onClick={() => seleccionarDificultad('dificil')}>Difícil</button>
    </div>
  );
};

export default ElegirDificultad;
