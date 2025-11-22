import axios from 'axios';
import AuthService from './authService';

const API_URL = import.meta.env.VITE_API_URL;

// Crear una instancia de Axios con la URL base
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar automáticamente el token a las requests
api.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken();
    
    // Validar que el token sea válido antes de enviarlo
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else if (token) {
      // Si hay un token pero es inválido, limpiarlo
      console.warn('[API] 🚨 Token inválido detectado, limpiando datos de auth:', token);
      AuthService.clearAuthData();
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interfaz para los datos del usuario
export interface User {
  nombre_usuario: string;
  email?: string;
  contraseña: string;
}

// Función para decodificar un token JWT manualmente
export const decodeToken = (token: string): { [key: string]: any } | null => {
  try {
    const payload = token.split('.')[1]; // Extraer la parte del payload
    const decodedPayload = atob(payload); // Decodificar Base64
    return JSON.parse(decodedPayload); // Convertir a objeto JSON
  } catch (err) {
    console.error('Error al decodificar el token:', err);
    return null; // Retornar null si hay un error
  }
};

// Función para registrar un usuario
export const registerUser = async ({
  nombre_usuario,
  email,
  contraseña,
  fromGoogle = false,
}: {
  nombre_usuario: string;
  email: string;
  contraseña: string;
  fromGoogle?: boolean;
}) => {
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_usuario, email, contraseña, fromGoogle }),
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

// Función para verificar si el token está cerca de expirar
export const isTokenExpiring = (token: string): boolean => {
  try {
    const decoded = decodeToken(token); // Usar la función personalizada
    if (!decoded || !decoded.exp) {
      throw new Error('El token no contiene un campo "exp"');
    }
    const currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos
    return decoded.exp - currentTime < 300; // Menos de 5 minutos para expirar
  } catch (err:any) {
    console.error('Error al verificar si el token está expirando:', err.message);
    return true; // Asumir que está expirado si hay un error
  }
};

// Función para refrescar el token
export const refreshAccessToken = async () => {
  try {
    const refreshToken = AuthService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    const response = await api.post('/refresh-token', { refreshToken });
    
    // Usar AuthService para guardar el nuevo token
    const success = AuthService.setAuthData({
      token: response.data.accessToken,
      username: AuthService.getUsername() || '',
      refreshToken: refreshToken,
      isAnonymous: AuthService.isAnonymous()
    });
    
    if (!success) {
      throw new Error('No se pudo guardar el nuevo token');
    }
    
    return response.data.accessToken;
  } catch (err: any) {
    console.error('Error al refrescar el token:', err.message);
    throw err;
  }
};

// Interceptor para manejar errores 401 (token expirado)
api.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, simplemente devuélvela
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Evitar bucles infinitos
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest); // Reintentar la solicitud original con el nuevo token
      } catch (err) {
        console.error('No se pudo refrescar el token. Redirigiendo al inicio de sesión.');
        AuthService.clearAuthData(); // Usar AuthService para limpiar datos
        window.location.href = '/'; // Redirige al inicio de sesión
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
