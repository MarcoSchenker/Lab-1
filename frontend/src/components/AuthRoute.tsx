// src/services/AuthRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary'; // Asegúrate de que la ruta sea correcta

export interface IAuthRouteProps {
    children: React.ReactNode;
}

const AuthRoute: React.FC<IAuthRouteProps> = ({ children }) => {
    const token = localStorage.getItem('token');
    const location = useLocation(); // Para guardar la ubicación y redirigir después del login

    if (!token) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return (
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    );
};

export default AuthRoute;