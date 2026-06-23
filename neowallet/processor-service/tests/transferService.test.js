'use strict';

const transferService = require('../src/services/transferService');
const transactionRepo = require('../src/repositories/transactionRepository');
const accountsClient = require('../src/utils/accountsClient');

jest.mock('../src/repositories/transactionRepository');
jest.mock('../src/utils/accountsClient');

afterEach(() => jest.clearAllMocks());

const mockTx = { id: 42, sender_id: 1, receiver_id: 2, amount: 100, status: 'PENDING' };

describe('transferService.transfer – validations', () => {
  it('returns self_transfer_not_allowed when sender equals receiver', async () => {
    const result = await transferService.transfer(1, 1, 100);
    expect(result.error).toBe('self_transfer_not_allowed');
    expect(result.status).toBe(400);
  });

  it('returns user_not_found when sender does not exist', async () => {
    accountsClient.getUser.mockResolvedValueOnce({ exists: false });
    accountsClient.getUser.mockResolvedValueOnce({ exists: true });
    const result = await transferService.transfer(99, 2, 100);
    expect(result.error).toBe('user_not_found');
    expect(result.status).toBe(404);
  });

  it('returns user_not_found when receiver does not exist', async () => {
    accountsClient.getUser.mockResolvedValueOnce({ exists: true });
    accountsClient.getUser.mockResolvedValueOnce({ exists: false });
    const result = await transferService.transfer(1, 99, 100);
    expect(result.error).toBe('user_not_found');
    expect(result.status).toBe(404);
  });
});

describe('transferService.transfer – happy path', () => {
  it('completes transfer and returns COMPLETED', async () => {
    accountsClient.getUser.mockResolvedValue({ exists: true });
    transactionRepo.createTransaction.mockResolvedValue(mockTx);
    accountsClient.updateBalance
      .mockResolvedValueOnce({ success: true, data: { new_balance: 900 } })  // debit sender
      .mockResolvedValueOnce({ success: true, data: { new_balance: 600 } }); // credit receiver
    transactionRepo.updateStatus.mockResolvedValue({});

    const result = await transferService.transfer(1, 2, 100);
    expect(result.status).toBe(200);
    expect(result.data.status).toBe('COMPLETED');
    expect(result.data.transaction_id).toBe(42);
  });
});

describe('transferService.transfer – insufficient funds', () => {
  it('marks FAILED and returns insufficient_funds when debit fails', async () => {
    accountsClient.getUser.mockResolvedValue({ exists: true });
    transactionRepo.createTransaction.mockResolvedValue(mockTx);
    accountsClient.updateBalance.mockResolvedValueOnce({ success: false, error: 'insufficient_funds', status: 400 });
    transactionRepo.updateStatus.mockResolvedValue({});

    const result = await transferService.transfer(1, 2, 9999);
    expect(result.error).toBe('insufficient_funds');
    expect(result.status).toBe(400);
    expect(transactionRepo.updateStatus).toHaveBeenCalledWith(42, 'FAILED', 'insufficient_funds');
  });
});

describe('transferService.transfer – Saga rollback', () => {
  it('rolls back sender debit when credit to receiver fails', async () => {
    accountsClient.getUser.mockResolvedValue({ exists: true });
    transactionRepo.createTransaction.mockResolvedValue(mockTx);
    accountsClient.updateBalance
      .mockResolvedValueOnce({ success: true, data: { new_balance: 900 } })   // debit ok
      .mockResolvedValueOnce({ success: false, error: 'credit_failed' })       // credit fails
      .mockResolvedValueOnce({ success: true, data: { new_balance: 1000 } }); // rollback ok
    transactionRepo.updateStatus.mockResolvedValue({});

    const result = await transferService.transfer(1, 2, 100);
    expect(result.error).toBe('transfer_failed');
    expect(result.status).toBe(502);
    // Rollback credit call
    expect(accountsClient.updateBalance).toHaveBeenCalledTimes(3);
    expect(transactionRepo.updateStatus).toHaveBeenCalledWith(42, 'ROLLED_BACK', 'credit_failed_rollback_ok');
  });

  it('marks FAILED when rollback itself also fails', async () => {
    accountsClient.getUser.mockResolvedValue({ exists: true });
    transactionRepo.createTransaction.mockResolvedValue(mockTx);
    accountsClient.updateBalance
      .mockResolvedValueOnce({ success: true })   // debit ok
      .mockResolvedValueOnce({ success: false })   // credit fails
      .mockResolvedValueOnce({ success: false });  // rollback fails too
    transactionRepo.updateStatus.mockResolvedValue({});

    const result = await transferService.transfer(1, 2, 100);
    expect(result.error).toBe('transfer_failed');
    expect(transactionRepo.updateStatus).toHaveBeenCalledWith(42, 'FAILED', 'credit_failed_rollback_failed');
  });
});

describe('transferService.getHistory', () => {
  it('returns list of transactions', async () => {
    transactionRepo.findByUserId.mockResolvedValue([mockTx]);
    const result = await transferService.getHistory(1);
    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(1);
  });
});
