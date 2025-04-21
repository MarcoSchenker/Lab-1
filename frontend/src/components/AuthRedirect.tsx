import React from 'react';
import { Navigate } from 'react-router-dom';

interface AuthRedirectProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const loggedInUser = localStorage.getItem('username'); // Verifica si hay un usuario logueado

  if (loggedInUser) {
    return <Navigate to="/dashboard" replace />; // Redirige a /dashboard si está logueado
  }

  return <>{children}</>; // Renderiza los hijos si no está logueado
};

export default AuthRedirect;