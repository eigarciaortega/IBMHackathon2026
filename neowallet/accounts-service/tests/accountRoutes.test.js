'use strict';

const request = require('supertest');
const app = require('../src/app');
const accountService = require('../src/services/accountService');

jest.mock('../src/services/accountService');

afterEach(() => jest.clearAllMocks());

describe('GET /accounts/:user_id', () => {
  it('200 – returns user data', async () => {
    accountService.getAccount.mockResolvedValue({
      status: 200,
      data: { id: 1, name: 'Alice', email: 'alice@neowallet.com', balance: 1000.00 },
    });
    const res = await request(app).get('/accounts/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice');
  });

  it('404 – user not found', async () => {
    accountService.getAccount.mockResolvedValue({ status: 404, error: 'user_not_found' });
    const res = await request(app).get('/accounts/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('user_not_found');
  });

  it('400 – non-numeric user_id', async () => {
    const res = await request(app).get('/accounts/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/recharge', () => {
  it('200 – recharges balance', async () => {
    accountService.rechargeBalance.mockResolvedValue({
      status: 200,
      data: { user_id: 1, new_balance: 1100.00 },
    });
    const res = await request(app)
      .post('/api/recharge')
      .send({ user_id: 1, amount: 100, payment_method: 'credit_card' });
    expect(res.status).toBe(200);
    expect(res.body.new_balance).toBe(1100);
  });

  it('400 – negative amount', async () => {
    const res = await request(app)
      .post('/api/recharge')
      .send({ user_id: 1, amount: -50, payment_method: 'credit_card' });
    expect(res.status).toBe(400);
  });

  it('400 – zero amount', async () => {
    const res = await request(app)
      .post('/api/recharge')
      .send({ user_id: 1, amount: 0, payment_method: 'credit_card' });
    expect(res.status).toBe(400);
  });

  it('400 – amount with more than 2 decimal places', async () => {
    const res = await request(app)
      .post('/api/recharge')
      .send({ user_id: 1, amount: 10.123, payment_method: 'credit_card' });
    expect(res.status).toBe(400);
  });
});

describe('POST /accounts/update-balance', () => {
  it('200 – debits successfully', async () => {
    accountService.updateBalance.mockResolvedValue({
      status: 200,
      data: { user_id: 1, previous_balance: 1000, new_balance: 900 },
    });
    const res = await request(app)
      .post('/accounts/update-balance')
      .send({ user_id: 1, amount: 100, operation: 'debit' });
    expect(res.status).toBe(200);
    expect(res.body.new_balance).toBe(900);
  });

  it('400 – invalid operation value', async () => {
    const res = await request(app)
      .post('/accounts/update-balance')
      .send({ user_id: 1, amount: 100, operation: 'withdraw' });
    expect(res.status).toBe(400);
  });

  it('400 – insufficient funds', async () => {
    accountService.updateBalance.mockResolvedValue({ status: 400, error: 'insufficient_funds' });
    const res = await request(app)
      .post('/accounts/update-balance')
      .send({ user_id: 1, amount: 99999, operation: 'debit' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('insufficient_funds');
  });
});
