import React, { useState } from 'react';
import Header from '../components/Header'; // Importamos el Header desde el folder components
import './LoginPage.css'; // Importamos el CSS específico para LoginPage
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
    <div className="login-container">
      <Header /> {/* Header arriba a la izquierda */}
      <hr className="line-white" /> {/* Línea blanca debajo del Header */}
      <div className="login-content">
        <h2>Iniciar Sesión</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={nombre_usuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
          />
          <button type="submit">Ingresar</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
