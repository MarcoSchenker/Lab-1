const request = require('supertest');
const { app } = require('../server');

describe('Server Basic Functionality', () => {
  test('GET / should return server status', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.text).toContain('Servidor Truco está activo');
  });

  test('GET /ping should return database connection status', async () => {
    const response = await request(app)
      .get('/ping')
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Conexión exitosa');
  });
});

describe('Auth Routes', () => {
  test('POST /usuarios should require all fields', async () => {
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre_usuario: 'testuser'
        // Missing email and password
      })
      .expect(400);
    
    expect(response.body.error).toContain('Todos los campos son obligatorios');
  });

  test('POST /login should require credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({})
      .expect(400);
  });
});

describe('Anonymous User Routes', () => {
  test('POST /usuario-anonimo should create anonymous user', async () => {
    const response = await request(app)
      .post('/usuario-anonimo')
      .expect(200);
    
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('nombre_usuario');
    expect(response.body.es_anonimo).toBe(true);
  });
});
