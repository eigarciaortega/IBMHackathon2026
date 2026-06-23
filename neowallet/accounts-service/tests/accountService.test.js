'use strict';

const accountService = require('../src/services/accountService');
const userRepository = require('../src/repositories/userRepository');

jest.mock('../src/repositories/userRepository');

const mockUser = { id: 1, name: 'Alice', email: 'alice@neowallet.com', balance: '1000.00' };

afterEach(() => jest.clearAllMocks());

describe('accountService.getAccount', () => {
  it('returns user data on success', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    const result = await accountService.getAccount(1);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(mockUser);
  });

  it('returns 404 when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);
    const result = await accountService.getAccount(999);
    expect(result.status).toBe(404);
    expect(result.error).toBe('user_not_found');
  });
});

describe('accountService.rechargeBalance', () => {
  it('credits balance and returns new balance', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.creditBalance.mockResolvedValue({ id: 1, new_balance: '1150.50' });
    const result = await accountService.rechargeBalance(1, 150.50);
    expect(result.status).toBe(200);
    expect(result.data.new_balance).toBe(1150.50);
  });

  it('returns 404 when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);
    const result = await accountService.rechargeBalance(99, 100);
    expect(result.status).toBe(404);
    expect(result.error).toBe('user_not_found');
  });
});

describe('accountService.updateBalance', () => {
  it('debits balance successfully', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.debitBalance.mockResolvedValue({ id: 1, new_balance: '900.00' });
    const result = await accountService.updateBalance(1, 100, 'debit');
    expect(result.status).toBe(200);
    expect(result.data.new_balance).toBe(900);
    expect(result.data.previous_balance).toBe(1000);
  });

  it('returns insufficient_funds when debit fails', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.debitBalance.mockResolvedValue(null); // no row returned = insufficient funds
    const result = await accountService.updateBalance(1, 9999, 'debit');
    expect(result.status).toBe(400);
    expect(result.error).toBe('insufficient_funds');
  });

  it('credits balance successfully', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.creditBalance.mockResolvedValue({ id: 1, new_balance: '1100.00' });
    const result = await accountService.updateBalance(1, 100, 'credit');
    expect(result.status).toBe(200);
    expect(result.data.new_balance).toBe(1100);
  });

  it('returns 404 when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);
    const result = await accountService.updateBalance(99, 50, 'debit');
    expect(result.status).toBe(404);
    expect(result.error).toBe('user_not_found');
  });
});
