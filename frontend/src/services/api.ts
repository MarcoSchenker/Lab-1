import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Crear una instancia de Axios con la URL base
const api = axios.create({
  baseURL: API_URL,
});

// Interfaz para los datos del usuario
export interface User {
  nombre_usuario: string;
  email?: string;
  contraseña: string;
}

// Función para registrar un usuario
export const registerUser = async ({
  nombre_usuario,
  email,
  contraseña,
  fromGoogle = false
}: {
  nombre_usuario: string;
  email: string;
  contraseña: string;
  fromGoogle?: boolean;
}) => {
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_usuario, email, contraseña, fromGoogle })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al registrar usuario');
  }

  return response.json();
};


// Función para iniciar sesión
export const loginUser = async (data: User) => {
  return await api.post('/login', data);
};

// Función para obtener estadísticas de un usuario
export const getStats = async (userId: string) => {
  return await api.get(`/estadisticas/${userId}`);
};

export default api;
