import api from '../services/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser } from '../services/api';
import { FaUser, FaLock } from 'react-icons/fa';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai'; // Íconos de ojito

const HomePage = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Para mostrar/ocultar la contraseña
  const navigate = useNavigate();

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    setAuthing(true);
    setError('');

    try {
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name, sub } = decoded;

        if (!email) {
          setError('No se pudo obtener tu email desde Google');
          return;
        }

        const nombre_usuario = name.replace(/\s+/g, '').toLowerCase();
        const contraseña = sub;

        try {
          const response = await loginUser({ nombre_usuario, contraseña });
          localStorage.setItem('username', nombre_usuario); // Guarda el nombre de usuario
          localStorage.setItem('token', response.data.token);
          setSuccessMessage(`¡Bienvenido, ${nombre_usuario}! Redirigiendo a tu dashboard...`);
          setTimeout(() => navigate('/dashboard'), 3000); // Redirigir después de 3 segundos
        } catch {
          await registerUser({ nombre_usuario, email, contraseña, fromGoogle: true });
          const response = await loginUser({ nombre_usuario, contraseña });
          localStorage.setItem('username', nombre_usuario); // Guarda el nombre de usuario
          localStorage.setItem('token', response.data.token);
          setSuccessMessage(`¡Registrado y logueado con Google como ${nombre_usuario}! Redirigiendo a tu dashboard...`);
          setTimeout(() => navigate('/dashboard'), 3000); // Redirigir después de 3 segundos
        }
      }
    } catch (err) {
      console.error('Error en login con Google:', err);
      setError('Ocurrió un error con Google Login');
    } finally {
      setAuthing(false);
    }
  };

  const handleLogin = async () => {
    setAuthing(true);
    setError('');
    try {
      const response = await loginUser({ nombre_usuario: nombreUsuario, contraseña: password });
      localStorage.setItem('username', response.data.nombre_usuario); // Guarda el nombre de usuario
      localStorage.setItem('token', response.data.accessToken); // Guarda el access token
      localStorage.setItem('refreshToken', response.data.refreshToken); // Guarda el refresh token
      setSuccessMessage('Inicio de sesión exitoso. Redirigiendo a tu dashboard...');
      setTimeout(() => navigate('/dashboard'), 3000); // Redirigir después de 3 segundos
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Credenciales inválidas. Verifica usuario y contraseña.');
    } finally {
      setAuthing(false);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      setAuthing(true);
      setError('');
      
      // Usa tu servicio api en lugar de fetch directo
      const response = await api.post('/usuario-anonimo');
      
      // Guardar datos en localStorage
      localStorage.setItem('username', response.data.nombre_usuario);
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('isAnonymous', 'true');
      
      setSuccessMessage(`¡Bienvenido, ${response.data.nombre_usuario}! Iniciando como invitado...`);
      setTimeout(() => navigate('/salas'), 1500);
    } catch (err) {
      console.error('Error al crear usuario anónimo:', err);
      setError('No se pudo crear usuario temporal. Intente de nuevo más tarde.');
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
          <button 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-fit"
          onClick={handleAnonymousLogin}
          disabled={authing}
        >
          {authing ? 'Creando usuario...' : 'Jugá sin Registrarte'}
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
            {successMessage ? ( // Mostrar el mensaje de éxito si existe
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 text-green-400">{successMessage}</h2>
                <p className="text-gray-300">Por favor, espere...</p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2 text-gray-100">Iniciar Sesión</h2>
                <p className="text-gray-300 mb-6">¡Bienvenido! Ingresa tus datos.</p>

                <div className="mb-4 flex items-center bg-transparent border-b border-gray-500">
                  <input
                    type="text"
                    id="username"
                    placeholder="Ingresa tu usuario"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full text-white py-2 bg-transparent focus:outline-none focus:border-white"
                  />
                  <FaUser className="text-gray-400 ml-2" />
                </div>
                

                <div className="mb-6 flex items-center bg-transparent border-b border-gray-500 relative">
                
                  <input
                    type={showPassword ? 'text' : 'password'} // Mostrar u ocultar contraseña
                    id="password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-white py-2 bg-transparent focus:outline-none focus:border-white"
                  />
                  <FaLock className="text-gray-400 ml-2" />
                  <div
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)} // Cambiar estado al hacer clic
                  >
                    {showPassword ? (
                      <AiFillEye className="text-gray-400" />
                    ) : (
                      <AiFillEyeInvisible className="text-gray-400" />
                    )}
                  </div>
                </div>

                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

                <button
                  onClick={handleLogin}
                  disabled={authing}
                  className="w-full bg-transparent border border-white text-white my-2 font-semibold rounded-md p-4 text-center flex items-center justify-center cursor-pointer"
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
                      onError={() => setError('Google Login falló')}
                      text="signin_with"
                      shape="rectangular"
                      size="large"
                      width="384px"
                      logo_alignment="center"
                    />
                  </div>
                </div>

                <div className="w-full flex items-center justify-center mt-10">
                  <p className="text-sm font-normal text-gray-400">
                    ¿No tenés una cuenta?{' '}
                    <span className="font-semibold text-sm text-white cursor-pointer underline">
                      <a href="/register">Registrate ya!</a>
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;