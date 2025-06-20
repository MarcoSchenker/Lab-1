const authController = require('../controllers/authController');
const estadisticasController = require('../controllers/estadisticasController');
const monedasController = require('../controllers/monedasController');
const amigosController = require('../controllers/amigosController');
const perfilController = require('../controllers/perfilController');

// Mock the database module
jest.mock('../config/db');

describe('Controller Unit Tests', () => {
  
  describe('Auth Controller', () => {
    test('should have all required methods', () => {
      expect(typeof authController.registrarUsuario).toBe('function');
      expect(typeof authController.loginUsuario).toBe('function');
      expect(typeof authController.crearUsuarioAnonimo).toBe('function');
      expect(typeof authController.eliminarUsuarioAnonimo).toBe('function');
      expect(typeof authController.refrescarToken).toBe('function');
      expect(typeof authController.obtenerUsuariosDisponibles).toBe('function');
      expect(typeof authController.obtenerIdUsuario).toBe('function');
      expect(typeof authController.obtenerUsername).toBe('function');
      expect(typeof authController.obtenerUsuarios).toBe('function');
    });

    test('registrarUsuario should validate required fields', async () => {
      const req = global.testHelper.createMockRequest({
        nombre_usuario: 'test'
        // Missing email and password
      });
      const res = global.testHelper.createMockResponse();

      await authController.registrarUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Todos los campos son obligatorios'
      });
    });

    test('registrarUsuario should validate email format', async () => {
      const req = global.testHelper.createMockRequest({
        nombre_usuario: 'test',
        email: 'invalid-email',
        contraseña: 'password123'
      });
      const res = global.testHelper.createMockResponse();

      await authController.registrarUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El email no tiene un formato válido'
      });
    });
  });

  describe('Estadisticas Controller', () => {
    test('should have all required methods', () => {
      expect(typeof estadisticasController.obtenerEstadisticasPorId).toBe('function');
      expect(typeof estadisticasController.obtenerEstadisticasPorUsername).toBe('function');
      expect(typeof estadisticasController.obtenerRanking).toBe('function');
    });
  });

  describe('Monedas Controller', () => {
    test('should have all required methods', () => {
      expect(typeof monedasController.obtenerMonedas).toBe('function');
      expect(typeof monedasController.añadirMonedas).toBe('function');
    });

    test('añadirMonedas should validate positive amount', async () => {
      const req = global.testHelper.createMockRequest(
        { cantidad: -100 },
        { usuario_id: '1' }
      );
      const res = global.testHelper.createMockResponse();

      await monedasController.añadirMonedas(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La cantidad debe ser un número positivo'
      });
    });
  });

  describe('Amigos Controller', () => {
    test('should have all required methods', () => {
      expect(typeof amigosController.enviarSolicitudAmistad).toBe('function');
      expect(typeof amigosController.obtenerAmigos).toBe('function');
      expect(typeof amigosController.obtenerSolicitudesPendientes).toBe('function');
      expect(typeof amigosController.aceptarSolicitud).toBe('function');
      expect(typeof amigosController.rechazarSolicitud).toBe('function');
    });

    test('enviarSolicitudAmistad should validate required fields', async () => {
      const req = global.testHelper.createMockRequest({
        from: 'user1'
        // Missing 'to' field
      });
      const res = global.testHelper.createMockResponse();

      await amigosController.enviarSolicitudAmistad(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Los campos "from" y "to" son obligatorios'
      });
    });
  });

  describe('Perfil Controller', () => {
    test('should have all required methods', () => {
      expect(typeof perfilController.subirFotoPerfil).toBe('function');
      expect(typeof perfilController.obtenerFotoPerfilPorUsername).toBe('function');
      expect(typeof perfilController.obtenerFotoPerfilPorId).toBe('function');
      expect(typeof perfilController.obtenerFotoPerfilAlternativo).toBe('function');
    });
  });
});
