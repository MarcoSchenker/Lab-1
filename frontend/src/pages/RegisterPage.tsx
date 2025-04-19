// src/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { registerUser, loginUser } from '../services/api';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';

const RegisterPage: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre_usuario || !email || !contraseña) {
      alert('Todos los campos son obligatorios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('El email no tiene un formato válido');
      return;
    }

    if (contraseña.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await registerUser({ nombre_usuario, email, contraseña });
      setSuccessMessage('Usuario registrado exitosamente. Redirigiendo al login...');
      setTimeout(() => {
        navigate('/'); // Redirigir al login después de 3 segundos
      }, 3000);
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      alert('Error al registrar usuario. Usuario o mail ya existentes.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (credentialResponse: CredentialResponse) => {
    setLoading(true);
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
          await registerUser({ nombre_usuario, email, contraseña, fromGoogle: true });
          alert(`¡Registrado exitosamente con Google como ${nombre_usuario}!`);
        } catch {
          alert('El usuario ya existe. Iniciando sesión...');
        }

        const response = await loginUser({ nombre_usuario, contraseña });
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error en el registro con Google:', error);
      alert('Ocurrió un error al registrarte con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[url('/Fondo.png')] bg-cover bg-center relative flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 z-0" />

      <div className="relative z-10 w-full h-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md p-8 text-gray-200">
          {successMessage ? ( // Mostrar el mensaje de éxito si existe
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
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full py-2 bg-transparent text-white focus:outline-none"
                  />
                  <FaUser className="text-gray-400 ml-2" />
                </div>

                <div className="mb-4 flex items-center border-b border-gray-500">
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2 bg-transparent text-white focus:outline-none"
                  />
                  <FaEnvelope className="text-gray-400 ml-2" />
                </div>

                <div className="mb-6 flex items-center border-b border-gray-500">
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
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
                  <GoogleLogin
                    onSuccess={handleGoogleSignUp}
                    onError={() => alert('Google Sign Up falló')}
                    text="signup_with"
                    shape="rectangular"
                    size="large"
                    width="384px"
                    logo_alignment="center"
                  />
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
