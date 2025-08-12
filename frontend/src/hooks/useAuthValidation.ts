// hooks/useAuthValidation.ts
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

interface UseAuthValidationResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  showDiagnostic: boolean;
  authIssues: string[];
  setShowDiagnostic: (show: boolean) => void;
}

export const useAuthValidation = (): UseAuthValidationResult => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [authIssues, setAuthIssues] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const validateAuth = () => {
      try {
        // Validar autenticación
        const authenticated = AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);

        // Si no está autenticado, validar los datos y diagnosticar problemas
        if (!authenticated) {
          const validation = AuthService.validateAuthData();
          setAuthIssues(validation.issues);

          // Si hay datos pero son inválidos, mostrar diagnóstico
          if (!validation.isValid && validation.issues.length > 0) {
            const hasToken = AuthService.getToken();
            const hasUsername = AuthService.getUsername();
            
            // Si hay datos pero son inválidos, probablemente es un problema de modo incógnito
            if ((hasToken && hasToken !== 'undefined') || (hasUsername && hasUsername !== 'undefined')) {
              console.warn('[useAuthValidation] 🚨 Datos de autenticación detectados pero inválidos:', validation.issues);
              setShowDiagnostic(true);
              return; // No redirigir inmediatamente, mostrar diagnóstico primero
            }
          }

          // Si no hay datos en absoluto, redirigir directamente
          console.log('[useAuthValidation] 🚪 No hay datos de autenticación, redirigiendo a home');
          navigate('/');
        }
      } catch (error) {
        console.error('[useAuthValidation] ❌ Error al validar autenticación:', error);
        setIsAuthenticated(false);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, [navigate]);

  return {
    isAuthenticated,
    isLoading,
    showDiagnostic,
    authIssues,
    setShowDiagnostic
  };
};
