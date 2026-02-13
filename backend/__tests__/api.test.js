const request = require('supertest');
const { app } = require('../server');

describe('Candela RMS API Tests', () => {
  // Health Check Test
  test('GET /health - should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });

  // 404 Test
  test('GET /nonexistent - should return 404', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.statusCode).toBe(404);
  });

  // Environment Test
  test('Environment variables should be defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});