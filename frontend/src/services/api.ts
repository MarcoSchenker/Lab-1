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
export const registerUser = async (data: { nombre_usuario: string; email: string; contraseña: string }) => {
  return await api.post('/usuarios', data);
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
