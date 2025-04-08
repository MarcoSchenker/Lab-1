import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser } from '../services/api';
import { FaUser, FaLock } from 'react-icons/fa'; // Importar los iconos

const HomePage = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
          const response = await loginUser({ nombre_usuario, contraseña });
          localStorage.setItem('token', response.data.token);
          alert(`¡Bienvenido, ${nombre_usuario}!`);
          navigate('/dashboard');
        } catch {
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
    <div className="h-screen w-screen bg-[url('/Fondo.png')] bg-cover bg-center relative flex items-center justify-center">
      {/* Capa oscura sobre fondo */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Contenido sobre fondo */}
      <div className="relative z-10 w-full h-full flex">
        {/* Panel Izquierdo - Descripción */}
        <div className="w-1/2 h-full p-12 text-white flex flex-col justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-5xl font-bold mb-6">El mejor Truco del Mundo</h1>
          <p className="text-lg mb-6">
            Trucho es una aplicación creada por los estudiantes Marco Schenker e Ignacio Gaspar.
            <br />
            <br />
            Acá los cracks juegan sin flor
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-fit">
            Jugá sin Registrarte
          </button>
          <div className="mt-10 flex items-center gap-4">
            <img src="/videoLogo.png" alt="Video" className="w-10 h-10" />
            <a
              href="https://www.youtube.com/watch?v=Nw8UFka_2i4&ab_channel=PoppularJuegos"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-300"
            >
              Aprendé a jugar al Truco
            </a>
          </div>
        </div>

        {/* Panel Derecho - Login */}
        <div className="w-1/2 h-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
          {/* Caja de login */}
          <div className="bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md p-8 text-gray-200">
            <h2 className="text-3xl font-bold mb-2 text-gray-100">Iniciar Sesión</h2>
            <p className="text-gray-300 mb-6">¡Bienvenido! Ingresa tus datos.</p>

            <div className="mb-4 flex items-center bg-transparent border-b border-gray-500">
              <input
                type="text"
                id="username"
                placeholder="Ingresa tu usuario"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                className='w-full text-white py-2 bg-transparent focus:outline-none focus:border-white'
              />
              <FaUser className="text-gray-400 ml-2" />
            </div>

            <div className="mb-6 flex items-center bg-transparent border-b border-gray-500">
              <input
                type="password"
                id="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full text-white py-2 bg-transparent focus:outline-none focus:border-white'
              />
              <FaLock className="text-gray-400 ml-2" />
            </div>

            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

            <button
              onClick={handleEmailLogin}
              disabled={authing}
              className='w-full bg-transparent border border-white text-white my-2 font-semibold rounded-md p-4 text-center flex items-center justify-center cursor-pointer'
             
            >
              {authing ? 'Conectando...' : 'Iniciar Sesión'}
            </button>

            <div className="flex items-center justify-center mb-5">
              <hr className="w-1/3 border-gray-300" />
              <span className="mx-4 text-gray-50 text-sm">O</span>
              <hr className="w-1/3 border-gray-300" />
            </div>

            <div className="flex justify-center mb-5 w-full">
              <div className="w-full flex justify-center rounded-lg overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => alert('Google Login falló')}
                  text="signin_with"
                  shape="rectangular"  // Cambiado de "circle" a "rectangular"
                  size="large"
                  width="384px"
                  logo_alignment="center"
                />
              </div>
            </div>
            {/* Link to sign up page */}
            <div className='w-full flex items-center justify-center mt-10'>
              <p className='text-sm font-normal text-gray-400'>¿No tenés una cuenta? <span className='font-semibold text-sm text-white cursor-pointer underline'><a href='/register'>Registrate ya!</a></span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;