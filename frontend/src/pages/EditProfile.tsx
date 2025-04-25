import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import api from '../services/api';

const EditProfile: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [contraseñaActual, setContraseñaActual] = useState('');
  const [nuevaContraseña, setNuevaContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId'); // Obtener el ID del usuario desde localStorage

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get(`/usuarios/id`, { params: { username: localStorage.getItem('username') } });
        const userData = response.data;
        setNombreUsuario(userData.nombre_usuario);
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        alert('Error al cargar los datos del usuario.');
      }
    };

    fetchUserData();
  }, []);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre_usuario) {
      alert('El nombre de usuario no puede estar vacío');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/usuarios/${userId}`, { nombre_usuario });
      setSuccessMessage('Nombre de usuario actualizado exitosamente.');
      setTimeout(() => {
        navigate('/dashboard'); // Redirigir al dashboard después de 3 segundos
      }, 3000);
    } catch (error) {
      console.error('Error al actualizar nombre de usuario:', error);
      alert('Error al actualizar el nombre de usuario. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contraseñaActual || !nuevaContraseña) {
      alert('Ambas contraseñas son obligatorias');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/usuarios/${userId}/contraseña`, { contraseñaActual, nuevaContraseña });
      setSuccessMessage('Contraseña actualizada exitosamente.');
      setTimeout(() => {
        navigate('/dashboard'); // Redirigir al dashboard después de 3 segundos
      }, 3000);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      alert('Error al actualizar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[url('/Fondo.png')] bg-cover bg-center relative flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 z-0" />
      <div className="relative z-10 w-full h-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className='flechita' onClick={() => navigate("/dashboard")}>
        <img src= "/flecha.png"/>
      </div>
        <div className="bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md p-8 text-gray-200">
          {successMessage ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-green-400">{successMessage}</h2>
              <p className="text-gray-300">Redirigiendo...</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-2 text-gray-100">Editar Perfil</h2>
              <p className="text-gray-300 mb-6">Actualizá tus datos personales</p>

              {/* Formulario para cambiar nombre de usuario */}
              <form onSubmit={handleUsernameChange}>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-transparent border border-white text-white my-2 font-semibold rounded-md p-4 text-center flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Actualizando...' : 'Actualizar Nombre de Usuario'}
                </button>
              </form>

              <hr className="my-6 border-gray-500" />

              {/* Formulario para cambiar contraseña */}
              <form onSubmit={handlePasswordChange}>
                <div className="mb-4 flex items-center border-b border-gray-500">
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={contraseñaActual}
                    onChange={(e) => setContraseñaActual(e.target.value)}
                    className="w-full py-2 bg-transparent text-white focus:outline-none"
                  />
                  <FaLock className="text-gray-400 ml-2" />
                </div>

                <div className="mb-4 flex items-center border-b border-gray-500">
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={nuevaContraseña}
                    onChange={(e) => setNuevaContraseña(e.target.value)}
                    className="w-full py-2 bg-transparent text-white focus:outline-none"
                  />
                  <FaLock className="text-gray-400 ml-2" />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-transparent border border-white text-white my-2 font-semibold rounded-md p-4 text-center flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfile;