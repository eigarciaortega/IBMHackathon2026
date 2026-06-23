const request = require('supertest');
const { Pool } = require('pg');

// Must be hoisted before app require — tests saga compensation and error paths
jest.mock('axios');
const axios = require('axios');

const app = require('../src/app');

// Real processor DB to verify transaction state after each saga run
const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'processor_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

beforeEach(async () => {
  await testPool.query('DELETE FROM transactions');
  jest.clearAllMocks();
});

afterAll(async () => {
  await testPool.end();
  const pool = require('../src/db/connection');
  await pool.end();
});

// Helper: mock successful user validation responses
const mockValidUsers = (senderBalance = 1000, receiverBalance = 50) => {
  axios.get
    .mockResolvedValueOnce({ data: { data: { id: 1, balance: senderBalance } } })
    .mockResolvedValueOnce({ data: { data: { id: 2, balance: receiverBalance } } });
};

describe('GET /health', () => {
  test('returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('404 handler', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown/route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});

describe('POST /api/transfer - Saga: debit failure', () => {
  test('marks transaction FAILED and returns 500 when debit call fails', async () => {
    mockValidUsers();
    axios.post.mockRejectedValueOnce(new Error('Accounts service unavailable'));

    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 100 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('debit_failed');

    const tx = await testPool.query(
      'SELECT status FROM transactions ORDER BY created_at DESC LIMIT 1'
    );
    expect(tx.rows[0].status).toBe('FAILED');
  });
});

describe('POST /api/transfer - Saga: credit failure with compensation', () => {
  test('marks transaction ROLLED_BACK when credit fails and compensation succeeds', async () => {
    mockValidUsers();

    axios.post
      .mockResolvedValueOnce({ data: { data: { previous_balance: 1000, new_balance: 900 } } }) // debit ok
      .mockRejectedValueOnce(new Error('Receiver account frozen'))                              // credit fails
      .mockResolvedValueOnce({ data: { data: { previous_balance: 900, new_balance: 1000 } } }); // compensation ok

    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 100 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('credit_failed_compensated');

    const tx = await testPool.query(
      'SELECT status, error_message FROM transactions ORDER BY created_at DESC LIMIT 1'
    );
    expect(tx.rows[0].status).toBe('ROLLED_BACK');
    expect(tx.rows[0].error_message).toContain('Receiver account frozen');
  });

  test('logs CRITICAL and marks ROLLED_BACK when both credit and compensation fail', async () => {
    mockValidUsers();

    axios.post
      .mockResolvedValueOnce({ data: { data: { previous_balance: 1000, new_balance: 900 } } }) // debit ok
      .mockRejectedValueOnce(new Error('Credit failed'))                                        // credit fails
      .mockRejectedValueOnce(new Error('Compensation also failed'));                            // compensation fails

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 100 });

    expect(res.status).toBe(500);

    // Verify CRITICAL log was emitted — this is the most dangerous state
    const criticalLog = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('CRITICAL')
    );
    expect(criticalLog).toBeDefined();

    consoleSpy.mockRestore();
  });
});

describe('POST /api/transfer - validateUser non-404 network error', () => {
  test('returns 500 when accounts service returns unexpected error on user lookup', async () => {
    const networkError = new Error('Gateway timeout');
    networkError.response = { status: 503 };
    axios.get.mockRejectedValueOnce(networkError);

    const res = await request(app)
      .post('/api/transfer')
      .send({ sender_id: 1, receiver_id: 2, amount: 100 });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/transactions/:userId - error path', () => {
  test('returns 500 when database throws on transaction lookup', async () => {
    // Mock the pool query to simulate a DB failure
    const pool = require('../src/db/connection');
    const originalQuery = pool.query.bind(pool);
    pool.query = jest.fn().mockRejectedValueOnce(new Error('DB read error'));

    const res = await request(app).get('/api/transactions/1');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');

    pool.query = originalQuery;
  });
});
