// `frontend/src/components/UploadProfilePicture.tsx`
import React, { useState } from 'react';
import api from '../services/api';

type Notification = { type: 'success' | 'error' | 'info'; text: string } | null;

const UploadProfilePicture: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<Notification>(null);

  const showNotification = (notif: NonNullable<Notification>, timeout = 4000) => {
    setNotification(notif);
    if (timeout > 0) setTimeout(() => setNotification(null), timeout);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showNotification({ type: 'error', text: 'Por favor selecciona una imagen' });
      return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const loggedInUser = localStorage.getItem('username');
      await api.post(`/usuarios/${loggedInUser}/foto-perfil`, formData);
      showNotification({ type: 'success', text: 'Foto de perfil subida exitosamente' });
    } catch (err) {
      console.error('Error al subir la foto de perfil:', err);
      showNotification({ type: 'error', text: 'Error al subir la foto de perfil' });
    }
  };

  return (
      <div>
        {notification && (
            <div className={`mb-2 p-2 rounded ${notification.type === 'success' ? 'bg-green-600 text-white' : notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              {notification.text}
            </div>
        )}
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button onClick={handleUpload}>Subir Foto</button>
      </div>
  );
};

export default UploadProfilePicture;
