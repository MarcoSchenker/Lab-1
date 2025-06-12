// Test setup file
// This file runs before all tests

// Test setup file
// This file runs before all tests

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock database connection for testing
jest.mock('../config/db', () => ({
  query: jest.fn().mockImplementation((sql, params) => {
    // Mock different responses based on SQL query
    if (sql.includes('SELECT 1 + 1 as result') || sql.includes('SELECT 1 + 1 AS result')) {
      return Promise.resolve([[{ result: 2 }]]);
    }
    if (sql.includes('SELECT * FROM usuarios WHERE')) {
      return Promise.resolve([[]]);  // No users found
    }
    if (sql.includes('INSERT INTO usuarios')) {
      return Promise.resolve([{ insertId: 1, affectedRows: 1 }]);
    }
    // Default empty response
    return Promise.resolve([[]]);
  })
}));

// Global test utilities
global.testHelper = {
  createMockRequest: (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    headers: {}
  }),
  
  createMockResponse: () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      send: jest.fn(() => res),
      set: jest.fn(() => res)
    };
    return res;
  }
};
