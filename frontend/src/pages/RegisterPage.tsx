import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { registerUser, loginUser } from '../services/api';
import AuthService from '../services/authService';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';

interface GoogleJwtPayload {
  email?: string;
  name?: string;
  sub?: string;
  [key: string]: unknown;
}

const googleClientConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const RegisterPage: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const navigate = useNavigate();

  const showMessage = (type: 'error' | 'success' | 'info', text: string, timeout = 4000) => {
    setMessage({ type, text });
    if (timeout > 0) setTimeout(() => setMessage(null), timeout);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nombre_usuario || !email || !contraseña) {
      showMessage('error', 'Todos los campos son obligatorios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage('error', 'El email no tiene un formato válido');
      return;
    }

    if (contraseña.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ nombre_usuario, email, contraseña });
      setSuccessMessage('Usuario registrado exitosamente. Redirigiendo al login...');
      showMessage('success', 'Usuario registrado correctamente', 2500);
      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      showMessage('error', 'Error al registrar usuario. Usuario o mail ya existentes.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (credentialResponse: CredentialResponse) => {
    setMessage(null);
    setLoading(true);

    try {
      if (!credentialResponse.credential) {
        showMessage('error', 'No se recibieron credenciales de Google.');
        return;
      }

      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      const { email: googleEmail, name, sub } = decoded;

      if (!googleEmail) {
        showMessage('error', 'No se pudo obtener tu email desde Google');
        return;
      }

      const generatedNombre = name ? name.replace(/\s+/g, '').toLowerCase() : `user${Date.now()}`;
      const generatedPassword = sub ?? `${Date.now()}`;

      // Intentar login primero (si ya existe)
      try {
        const response = await loginUser({ nombre_usuario: generatedNombre, contraseña: generatedPassword });
        const token = response?.data?.accessToken || response?.data?.token;
        const username = response?.data?.nombre_usuario || generatedNombre;
        const refreshToken = response?.data?.refreshToken;

        const saved = AuthService.setAuthData({
          token,
          username,
          refreshToken,
          isAnonymous: false
        });

        if (!saved) {
          throw new Error('No se pudieron guardar los datos de autenticación.');
        }

        setSuccessMessage(`¡Bienvenido, ${username}! Redirigiendo a tu dashboard...`);
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      } catch (loginErr) {
        // No existe: intentar registrar y luego loguear
        try {
          await registerUser({ nombre_usuario: generatedNombre, email: googleEmail, contraseña: generatedPassword, fromGoogle: true });
          showMessage('success', `Registrado exitosamente con Google como ${generatedNombre}`, 2000);
        } catch (registerErr) {
          // Si falla el registro, asumimos que ya existe y seguiremos al login
          showMessage('info', 'El usuario ya existe. Iniciando sesión...', 2000);
        }

        try {
          const response2 = await loginUser({ nombre_usuario: generatedNombre, contraseña: generatedPassword });
          const token2 = response2?.data?.accessToken || response2?.data?.token;
          const username2 = response2?.data?.nombre_usuario || generatedNombre;
          const refreshToken2 = response2?.data?.refreshToken;

          const saved2 = AuthService.setAuthData({
            token: token2,
            username: username2,
            refreshToken: refreshToken2,
            isAnonymous: false
          });

          if (!saved2) {
            if (AuthService.isIncognitoMode()) {
              showMessage('error', 'Modo incógnito detectado. No se pudieron guardar las credenciales.', 5000);
            } else {
              showMessage('error', 'No se pudieron guardar las credenciales. Revisa el almacenamiento del navegador.', 5000);
            }
            return;
          }

          setSuccessMessage(`¡Registrado / Logueado como ${username2}! Redirigiendo a tu dashboard...`);
          setTimeout(() => navigate('/dashboard'), 1500);
        } catch (finalLoginErr) {
          console.error('Error al iniciar sesión después de Google:', finalLoginErr);
          showMessage('error', 'Error al iniciar sesión con Google.');
        }
      }
    } catch (error) {
      console.error('Error en el registro con Google:', error);
      showMessage('error', 'Ocurrió un error al registrarte con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="h-screen w-screen bg-[url('/Fondo.png')] bg-cover bg-center relative flex items-center justify-center">
        <div className="absolute inset-0 bg-black/10 z-0" />

        <div className="relative z-10 w-full h-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md p-8 text-gray-200">
            {message && (
                <div
                    className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-600' : message.type === 'success' ? 'bg-green-600' : 'bg-yellow-600'}`}
                    role="status"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{message.text}</span>
                    <button className="ml-4 font-bold" onClick={() => setMessage(null)} aria-label="Cerrar mensaje">
                      ✕
                    </button>
                  </div>
                </div>
            )}

            {successMessage ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4 text-green-400">{successMessage}</h2>
                  <p className="text-gray-300">Por favor, espere...</p>
                </div>
            ) : (
                <>
                  <h2 className="text-3xl font-bold mb-2 text-gray-100">Registro</h2>
                  <p className="text-gray-300 mb-6">¡Creá tu cuenta y empezá a jugar!</p>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-4 flex items-center border-b border-gray-500">
                      <input
                          type="text"
                          placeholder="Nombre de usuario"
                          value={nombre_usuario}
                          onChange={(e) => {
                            setNombreUsuario(e.target.value);
                            setMessage(null);
                          }}
                          className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaUser className="text-gray-400 ml-2" />
                    </div>

                    <div className="mb-4 flex items-center border-b border-gray-500">
                      <input
                          type="email"
                          placeholder="Correo electrónico"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setMessage(null);
                          }}
                          className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaEnvelope className="text-gray-400 ml-2" />
                    </div>

                    <div className="mb-6 flex items-center border-b border-gray-500">
                      <input
                          type="password"
                          placeholder="Contraseña"
                          value={contraseña}
                          onChange={(e) => {
                            setContraseña(e.target.value);
                            setMessage(null);
                          }}
                          className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaLock className="text-gray-400 ml-2" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-transparent border border-white text-white my-2 font-semibold rounded-md p-4 text-center flex items-center justify-center cursor-pointer"
                    >
                      {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                  </form>

                  <div className="flex items-center justify-center my-5">
                    <hr className="w-1/3 border-gray-300" />
                    <span className="mx-4 text-gray-50 text-sm">O</span>
                    <hr className="w-1/3 border-gray-300" />
                  </div>

                  <div className="flex justify-center w-full mb-4">
                    <div className="w-full flex justify-center rounded-lg overflow-hidden">
                      {googleClientConfigured ? (
                          <GoogleLogin
                              onSuccess={handleGoogleSignUp}
                              onError={() => showMessage('error', 'Google Sign Up falló')}
                              text="signup_with"
                              shape="rectangular"
                              size="large"
                              width="384px"
                              logo_alignment="center"
                          />
                      ) : (
                          <p className="text-center text-sm text-gray-400">
                            Google Sign Up no está disponible. Contacta al administrador.
                          </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-center mt-6">
                    <p className="text-sm font-normal text-gray-400">
                      ¿Ya tenés una cuenta?{' '}
                      <a href="/" className="font-semibold text-white underline">
                        Iniciá sesión
                      </a>
                    </p>
                  </div>
                </>
            )}
          </div>
        </div>
      </div>
  );
};

export default RegisterPage;
