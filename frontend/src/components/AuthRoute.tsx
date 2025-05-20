// src/services/AuthRoute.tsx
import React, {ReactNode} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary'; // Asegúrate de que la ruta sea correcta

export interface IAuthRouteProps {
    children: React.ReactNode;
}

const AuthRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    const isAnonymous = localStorage.getItem('isAnonymous') === 'true';
    const location = useLocation(); // Para guardar la ubicación y redirigir después del login
    const restrictedRoutesForAnonymous = [
    '/skins', 
    '/store', 
    '/store-mp',
    '/modificar-perfil',
    '/eliminar-perfil',
    '/friends',
    '/friends-request',
    '/agregar-amigo',
    '/dashboard'
  ];

    if (!token) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }


      if (isAnonymous && restrictedRoutesForAnonymous.includes(location.pathname)) {
    return <Navigate to="/salas" />;
  }
  
  return <>{children}</>;
};

export default AuthRoute;