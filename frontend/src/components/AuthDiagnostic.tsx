// components/AuthDiagnostic.tsx
import React, { useState, useEffect } from 'react';
import AuthService from '../services/authService';

interface AuthDiagnosticProps {
  isVisible: boolean;
  onClose: () => void;
}

const AuthDiagnostic: React.FC<AuthDiagnosticProps> = ({ isVisible, onClose }) => {
  const [diagnosis, setDiagnosis] = useState<{
    diagnosis: string;
    suggestions: string[];
  }>({ diagnosis: '', suggestions: [] });

  const [authData, setAuthData] = useState<{
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;
    isIncognito: boolean;
    isAnonymous: boolean;
  }>({
    token: null,
    username: null,
    isAuthenticated: false,
    isIncognito: false,
    isAnonymous: false
  });

  useEffect(() => {
    if (isVisible) {
      // Obtener diagnóstico
      const diagnosisResult = AuthService.diagnoseAuthIssues();
      setDiagnosis(diagnosisResult);

      // Obtener datos de autenticación actuales
      setAuthData({
        token: AuthService.getToken(),
        username: AuthService.getUsername(),
        isAuthenticated: AuthService.isAuthenticated(),
        isIncognito: AuthService.isIncognitoMode(),
        isAnonymous: AuthService.isAnonymous()
      });
    }
  }, [isVisible]);

  const handleClearAuth = () => {
    AuthService.clearAuthData();
    window.location.href = '/';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Diagnóstico de Autenticación</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Estado actual */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Estado Actual</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Autenticado:</span>{' '}
                <span className={authData.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {authData.isAuthenticated ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Modo Incógnito:</span>{' '}
                <span className={authData.isIncognito ? 'text-orange-600' : 'text-green-600'}>
                  {authData.isIncognito ? '🕵️ Sí' : '👁️ No'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Usuario Anónimo:</span>{' '}
                <span className={authData.isAnonymous ? 'text-blue-600' : 'text-gray-600'}>
                  {authData.isAnonymous ? '👤 Sí' : '🔐 No'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Usuario:</span>{' '}
                <span className="text-gray-800 font-mono text-xs">
                  {authData.username || 'No encontrado'}
                </span>
              </div>
            </div>
          </div>

          {/* Token info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Información del Token</h3>
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium">Token:</span>{' '}
              {authData.token ? (
                <div className="mt-2">
                  <span className="text-green-600">✅ Presente</span>
                  <div className="text-xs text-gray-600 font-mono break-all mt-1">
                    {authData.token.substring(0, 50)}...
                  </div>
                </div>
              ) : (
                <span className="text-red-600">❌ No encontrado</span>
              )}
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Diagnóstico</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-800 mb-3">{diagnosis.diagnosis}</p>
              
              {diagnosis.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Sugerencias:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {diagnosis.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={handleClearAuth}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Limpiar Datos y Reiniciar
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Refrescar Página
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>

          {/* Información adicional para modo incógnito */}
          {authData.isIncognito && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded">
              <h4 className="font-medium text-orange-800 mb-2">⚠️ Modo Incógnito Detectado</h4>
              <p className="text-sm text-orange-700">
                En modo incógnito, algunos navegadores limitan el almacenamiento local, lo que puede causar
                problemas de autenticación. Para una mejor experiencia:
              </p>
              <ul className="list-disc list-inside text-sm text-orange-700 mt-2 space-y-1">
                <li>Abre el sitio en una ventana normal (no incógnito)</li>
                <li>Evita cerrar y abrir pestañas frecuentemente</li>
                <li>Si necesitas usar modo incógnito, considera usar el "Juego sin Registrarte"</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthDiagnostic;
