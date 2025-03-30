import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1>Bienvenido a Truco Online 🎴</h1>
      <p>Elige una opción para comenzar:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <Link
          to="/login"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007BFF',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Iniciar Sesión
        </Link>
        <Link
          to="/register"
          style={{
            padding: '10px 20px',
            backgroundColor: '#28A745',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Registrarse
        </Link>
        <Link
          to="/stats/1" // Cambia el ID según sea necesario
          style={{
            padding: '10px 20px',
            backgroundColor: '#FFC107',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Ver Estadísticas
        </Link>
      </div>
    </div>
  );
}

export default HomePage;