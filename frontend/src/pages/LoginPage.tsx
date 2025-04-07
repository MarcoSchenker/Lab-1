import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import { loginUser, registerUser } from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 🔐 Login con Google OAuth2
  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    setAuthing(true);
    setError('');

    try {
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name, sub } = decoded;

        if (!email) {
          alert('No se pudo obtener tu email desde Google');
          return;
        }

        const nombre_usuario = name.replace(/\s+/g, '').toLowerCase();
        const contraseña = sub;

        try {
          // Intentar iniciar sesión
          const response = await loginUser({ nombre_usuario, contraseña });
          localStorage.setItem('token', response.data.token);
          alert(`¡Bienvenido, ${nombre_usuario}!`);
          navigate('/dashboard');
        } catch {
          // Si el usuario no existe, registrarlo automáticamente
          await registerUser({ nombre_usuario, email, contraseña, fromGoogle: true });
          const response = await loginUser({ nombre_usuario, contraseña });
          localStorage.setItem('token', response.data.token);
          alert(`¡Registrado y logueado con Google como ${nombre_usuario}!`);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Error en login con Google:', err);
      alert('Ocurrió un error con Google Login');
    } finally {
      setAuthing(false);
    }
  };

  // 📨 Login con email y contraseña
  const handleEmailLogin = async () => {
    setAuthing(true);
    setError('');
    try {
      const response = await loginUser({ nombre_usuario: nombreUsuario, contraseña: password });
      localStorage.setItem('token', response.data.token);
      alert('Inicio de sesión exitoso');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Credenciales inválidas. Verifica usuario y contraseña.');
    } finally {
      setAuthing(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar Sesión</h2>
      <input
        type="text"
        placeholder="Usuario"
        value={nombreUsuario}
        onChange={(e) => setNombreUsuario(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleEmailLogin} disabled={authing}>
        {authing ? 'Conectando...' : 'Ingresar'}
      </button>

      <div style={{ margin: '1rem 0' }}>
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => alert('Google Login falló')}
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;