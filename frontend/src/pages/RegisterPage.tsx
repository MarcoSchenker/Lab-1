import React, { useState } from 'react';
import Header from '../components/Header'; // Importamos el Header desde el folder components
import './RegisterPage.css'; // Importamos el CSS específico para RegisterPage
import { registerUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [contraseña, setContraseña] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que todos los campos estén completos
    if (!nombre_usuario || !email || !contraseña) {
      alert('Todos los campos son obligatorios');
      return;
    }

    // Validar el formato del email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('El email no tiene un formato válido');
      return;
    }

    // Validar la longitud de la contraseña
    if (contraseña.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await registerUser({ nombre_usuario, email, contraseña });
      alert('Usuario registrado exitosamente');
      setNombreUsuario('');
      setEmail('');
      setContraseña('');
      navigate('/login');
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      alert('Error al registrar usuario. Usuario o mail ya existentes. Por favor, intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <Header /> {/* Header arriba a la izquierda */}
      <hr className="line-white" /> {/* Línea blanca debajo del Header */}
      <div className="register-content">
        <h2>Registro</h2>
        <form className="register-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={nombre_usuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;