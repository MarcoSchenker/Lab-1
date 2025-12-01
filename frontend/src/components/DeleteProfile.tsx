// `frontend/src/components/DeleteProfile.tsx`
import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

type Notification = { type: 'success' | 'error' | 'info'; text: string } | null;

const DeleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const loggedInUser = localStorage.getItem('username');
  const [userId, setUserId] = useState<number | null>(null); // ID del usuario
  const [notification, setNotification] = useState<Notification>(null);

  const showNotification = (notif: NonNullable<Notification>, timeout = 4000) => {
    setNotification(notif);
    if (timeout > 0) {
      setTimeout(() => setNotification(null), timeout);
    }
  };

  const handleDelete = async () => {
    try {
      const userIdResponse = await api.get('/usuarios/id', { params: { username: loggedInUser } });
      const userId = userIdResponse.data.id;
      setUserId(userId);
      console.log('ID del usuario:', userId);
      await api.delete(`/usuarios/${userId}`);
      showNotification({ type: 'success', text: 'Perfil eliminado exitosamente.' }, 2500);
      setTimeout(() => {
        localStorage.clear();
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error al eliminar el perfil:', error);
      showNotification({ type: 'error', text: 'Error al eliminar el perfil. Intenta nuevamente.' });
    }
  };

  const handleCancel = () => {
    navigate('/dashboard'); // Redirigir al dashboard si se cancela
  };

  return (
      <div className="h-screen w-screen bg-[url('/Fondo.png')] bg-cover bg-center relative flex items-center justify-center">
        <div className="absolute inset-0 bg-black/10 z-0" />
        <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-xl shadow-xl p-8 text-gray-200">
          {notification && (
              <div className={`mb-4 p-3 rounded ${notification.type === 'success' ? 'bg-green-600 text-white' : notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                {notification.text}
              </div>
          )}
          <h2 className="text-2xl font-bold mb-4 text-red-400">¿Estás seguro?</h2>
          <p className="text-gray-300 mb-6">Esta acción eliminará tu perfil de forma permanente.</p>
          <div className="flex justify-between">
            <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Eliminar Perfil
            </button>
          </div>
        </div>
      </div>
  );
};

export default DeleteProfile;
