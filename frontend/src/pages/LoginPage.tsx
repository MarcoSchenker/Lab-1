import React, { useState } from 'react';
import Header from '../components/Header';
import { loginUser } from '../services/api.ts';

const LoginPage = () => {
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre_usuario || !contraseña) {
      alert('Por favor, completa todos los campos');
      return;
    }

    try {
      const response = await loginUser({ nombre_usuario, contraseña });
      alert(`Bienvenido ${nombre_usuario}!`);
      localStorage.setItem('token', response.data.token);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      alert('Error al iniciar sesión');
    }
  };

  return (
    <div>
      <Header /> {/* Agregamos el Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: '20px', /* Espacio debajo del Header */
        textAlign: 'center' 
      }}>
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px' }}>
          <input
            type="text"
            placeholder="Usuario"
            value={nombre_usuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            style={{ marginBottom: '10px', padding: '10px', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            style={{ marginBottom: '10px', padding: '10px', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
