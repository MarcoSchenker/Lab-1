// services/authService.ts
export class AuthService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly USERNAME_KEY = 'username';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly IS_ANONYMOUS_KEY = 'isAnonymous';

  /**
   * Detecta si estamos en modo incógnito verificando si localStorage funciona correctamente
   */
  static isIncognitoMode(): boolean {
    try {
      const testKey = 'test_localStorage';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      // En algunos browsers incógnito, localStorage existe pero no persiste datos entre páginas
      return retrieved !== 'test';
    } catch (e) {
      // En algunos browsers, localStorage no existe en modo incógnito
      return true;
    }
  }

  /**
   * Almacena datos de autenticación de manera segura
   */
  static setAuthData(data: {
    token: string;
    username: string;
    refreshToken?: string;
    isAnonymous?: boolean;
  }): boolean {
    try {
      localStorage.setItem(this.TOKEN_KEY, data.token);
      localStorage.setItem(this.USERNAME_KEY, data.username);
      
      if (data.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      if (data.isAnonymous) {
        localStorage.setItem(this.IS_ANONYMOUS_KEY, 'true');
      }

      // Verificar que los datos se guardaron correctamente
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      const savedUsername = localStorage.getItem(this.USERNAME_KEY);
      
      if (savedToken !== data.token || savedUsername !== data.username) {
        console.warn('[AuthService] 🚨 Los datos no se guardaron correctamente en localStorage');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AuthService] ❌ Error al guardar datos de autenticación:', error);
      return false;
    }
  }

  /**
   * Obtiene el token de autenticación
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] ❌ Error al obtener token:', error);
      return null;
    }
  }

  /**
   * Obtiene el nombre de usuario
   */
  static getUsername(): string | null {
    try {
      return localStorage.getItem(this.USERNAME_KEY);
    } catch (error) {
      console.error('[AuthService] ❌ Error al obtener username:', error);
      return null;
    }
  }

  /**
   * Obtiene el refresh token
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] ❌ Error al obtener refresh token:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario es anónimo
   */
  static isAnonymous(): boolean {
    try {
      return localStorage.getItem(this.IS_ANONYMOUS_KEY) === 'true';
    } catch (error) {
      console.error('[AuthService] ❌ Error al verificar si es anónimo:', error);
      return false;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    const username = this.getUsername();
    
    if (!token || !username) {
      return false;
    }

    // Verificar que el token no esté vacío o sea "undefined"
    if (token === 'undefined' || token === 'null' || token.trim() === '') {
      console.warn('[AuthService] 🚨 Token inválido detectado:', token);
      this.clearAuthData();
      return false;
    }

    return true;
  }

  /**
   * Limpia todos los datos de autenticación
   */
  static clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USERNAME_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.IS_ANONYMOUS_KEY);
      
      console.log('[AuthService] 🧹 Datos de autenticación limpiados');
    } catch (error) {
      console.error('[AuthService] ❌ Error al limpiar datos de autenticación:', error);
    }
  }

  /**
   * Valida que los datos de localStorage sean consistentes
   */
  static validateAuthData(): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    const token = this.getToken();
    const username = this.getUsername();
    
    if (!token) {
      issues.push('Token no encontrado');
    } else if (token === 'undefined' || token === 'null') {
      issues.push('Token es "undefined" o "null"');
    }
    
    if (!username) {
      issues.push('Username no encontrado');
    } else if (username === 'undefined' || username === 'null') {
      issues.push('Username es "undefined" o "null"');
    }

    if (this.isIncognitoMode()) {
      issues.push('Modo incógnito detectado - localStorage puede no persistir');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Diagnostica problemas de autenticación y sugiere soluciones
   */
  static diagnoseAuthIssues(): {
    diagnosis: string;
    suggestions: string[];
  } {
    const validation = this.validateAuthData();
    const isIncognito = this.isIncognitoMode();
    
    let diagnosis = 'Sin problemas detectados';
    const suggestions: string[] = [];

    if (!validation.isValid) {
      diagnosis = `Problemas de autenticación detectados: ${validation.issues.join(', ')}`;
      
      if (isIncognito) {
        suggestions.push('Cambiar a una ventana normal (no incógnito) para mejor persistencia de datos');
        suggestions.push('Evitar cerrar y abrir pestañas en modo incógnito');
      }
      
      if (validation.issues.some(issue => issue.includes('undefined'))) {
        suggestions.push('Limpiar datos de autenticación y volver a iniciar sesión');
        suggestions.push('Verificar que el servidor esté devolviendo tokens válidos');
      }
    }

    return { diagnosis, suggestions };
  }
}

export default AuthService;
