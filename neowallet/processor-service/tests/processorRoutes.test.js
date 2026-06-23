'use strict';

const request = require('supertest');
const app = require('../src/app');
const transferService = require('../src/services/transferService');

jest.mock('../src/services/transferService');

afterEach(() => jest.clearAllMocks());

describe('POST /api/transfer', () => {
  it('200 – successful transfer', async () => {
    transferService.transfer.mockResolvedValue({
      status: 200,
      data: { transaction_id: 1, status: 'COMPLETED', message: 'Transfer completed successfully' },
    });
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('400 – self transfer', async () => {
    transferService.transfer.mockResolvedValue({ status: 400, error: 'self_transfer_not_allowed' });
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 1, amount: 100 });
    expect(res.status).toBe(400);
  });

  it('400 – missing sender_id', async () => {
    const res = await request(app)
      .post('/api/transfer')
      .send({ receiver_id: 2, amount: 100 });
    expect(res.status).toBe(400);
  });

  it('400 – zero amount', async () => {
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 0 });
    expect(res.status).toBe(400);
  });

  it('400 – negative amount', async () => {
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: -10 });
    expect(res.status).toBe(400);
  });

  it('400 – amount with 3 decimal places', async () => {
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 10.123 });
    expect(res.status).toBe(400);
  });

  it('404 – user not found', async () => {
    transferService.transfer.mockResolvedValue({ status: 404, error: 'user_not_found' });
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 99, receiver_id: 2, amount: 50 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('user_not_found');
  });

  it('400 – insufficient_funds', async () => {
    transferService.transfer.mockResolvedValue({ status: 400, error: 'insufficient_funds' });
    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('insufficient_funds');
  });
});

describe('GET /api/transactions/:user_id', () => {
  it('200 – returns history', async () => {
    transferService.getHistory.mockResolvedValue({
      status: 200,
      data: [{ id: 1, sender_id: 1, receiver_id: 2, amount: 100, status: 'COMPLETED' }],
    });
    const res = await request(app).get('/api/transactions/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('400 – non-numeric user_id', async () => {
    const res = await request(app).get('/api/transactions/abc');
    expect(res.status).toBe(400);
  });
});
