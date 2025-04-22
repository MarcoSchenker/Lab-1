import React, { useState } from 'react';
import api from '../services/api';

const UploadProfilePicture: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const loggedInUser = localStorage.getItem('username');
      await api.post(`/usuarios/${loggedInUser}/foto-perfil`, formData);
      alert('Foto de perfil subida exitosamente');
    } catch (err) {
      console.error('Error al subir la foto de perfil:', err);
      alert('Error al subir la foto de perfil');
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Subir Foto</button>
    </div>
  );
};

export default UploadProfilePicture;