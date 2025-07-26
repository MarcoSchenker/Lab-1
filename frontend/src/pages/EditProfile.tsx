import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaArrowLeft, FaEdit, FaShieldAlt } from 'react-icons/fa';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import api from '../services/api';
import './EditProfile.css';

const EditProfile: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [contraseñaActual, setContraseñaActual] = useState('');
  const [nuevaContraseña, setNuevaContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const navigate = useNavigate();

  const loggedInUser = localStorage.getItem('username'); // Obtener el ID del usuario desde localStorage

  useEffect(() => {
    const fetchUserData = async () => {
      try {

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
      await api.put(`/usuarios/${loggedInUser}/username`, { nuevo_nombre_usuario: nombre_usuario });

      // Actualizar el nombre de usuario en el localStorage
      localStorage.setItem('username', nombre_usuario);

      setSuccessMessage('Nombre de usuario actualizado exitosamente.');
      setTimeout(() => {
        navigate('/dashboard'); 
      }, 1000);
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
      await api.put(`/usuarios/${loggedInUser}/password`, { contraseñaActual, nuevaContraseña });

      setSuccessMessage('Contraseña actualizada exitosamente.');
      setTimeout(() => {
        navigate('/dashboard'); // Redirigir al dashboard después de 3 segundos
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      alert('Error al actualizar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-content">
        <div className="edit-profile-header">
          <button className="back-button" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft />
            Volver
          </button>
        </div>
        
        <div className="edit-profile-card">
          {/* Logo */}
          <div className="logo-container">
            <img src="/logo.png" alt="Trucho Logo" className="logo" />
          </div>

          {successMessage ? (
            <div className="success-message">
              <h2>{successMessage}</h2>
              <p>Redirigiendo...</p>
            </div>
          ) : (
            <>
              <h1 className="edit-profile-title">
                <FaEdit className="title-icon" />
                Editar Perfil
              </h1>
              <p className="edit-profile-subtitle">
                <FaShieldAlt className="subtitle-icon" />
                Actualizá tus datos personales
              </p>

             {/* Formulario para cambiar nombre de usuario */}
              <div className="form-section">
                <form onSubmit={handleUsernameChange}>
                  <div className="form-group">
                    <div className="mb-4 flex items-center border-b border-gray-500">
                      <input
                        type="text"
                        placeholder="Nuevo nombre de usuario"
                        value={nombre_usuario}
                        onChange={(e) => setNombreUsuario(e.target.value)}
                        className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaUser className="text-gray-400 ml-2" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="form-button"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar Nombre de Usuario'}
                  </button>
                </form>
              </div>

              <hr className="form-divider" />

                {/* Formulario para cambiar contraseña */}
              <div className="form-section">
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <div className="mb-4 flex items-center border-b border-gray-500 relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Contraseña actual"
                        value={contraseñaActual}
                        onChange={(e) => setContraseñaActual(e.target.value)}
                        className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaLock className="text-gray-400 ml-2" />
                      <div
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <AiFillEye className="text-gray-400" />
                        ) : (
                          <AiFillEyeInvisible className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="mb-4 flex items-center border-b border-gray-500 relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Nueva contraseña"
                        value={nuevaContraseña}
                        onChange={(e) => setNuevaContraseña(e.target.value)}
                        className="w-full py-2 bg-transparent text-white focus:outline-none"
                      />
                      <FaLock className="text-gray-400 ml-2" />
                      <div
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <AiFillEye className="text-gray-400" />
                        ) : (
                          <AiFillEyeInvisible className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="form-button"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfile;