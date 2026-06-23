import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { User } from './entities/user.entity';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User =>
  ({ id: 1, name: 'Test User', email: 'test@test.com', balance: 500, ...overrides } as User);

const makeQueryRunner = (findOneResult: User | null = makeUser()) => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    findOne: jest.fn().mockResolvedValue(findOneResult),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  },
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AccountsService', () => {
  let service: AccountsService;
  let mockUserRepository: { findOne: jest.Mock };
  let mockDataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    mockUserRepository = { findOne: jest.fn() };
    mockDataSource = { createQueryRunner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  // ── getAccount ──────────────────────────────────────────────────────────────

  describe('getAccount', () => {
    it('returns the user when found', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.getAccount(1);

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccount(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── recharge ────────────────────────────────────────────────────────────────

  describe('recharge', () => {
    it('credits balance and returns new_balance', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 100 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.recharge({
        user_id: 1,
        amount: 50,
        payment_method: 'credit_card',
      });

      expect(result.new_balance).toBe(150);
      expect(result.payment_method).toBe('credit_card');
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('preserves 2-decimal precision in balance arithmetic', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 10.1 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.recharge({
        user_id: 1,
        amount: 0.2,
        payment_method: 'debit_card',
      });

      expect(result.new_balance).toBe(10.3);
    });

    it('throws 400 when amount is zero', async () => {
      await expect(
        service.recharge({ user_id: 1, amount: 0, payment_method: 'credit_card' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 400 when amount is negative', async () => {
      await expect(
        service.recharge({ user_id: 1, amount: -10, payment_method: 'credit_card' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('throws 404 and rolls back when user does not exist inside transaction', async () => {
      const qr = makeQueryRunner(null);
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.recharge({ user_id: 99, amount: 100, payment_method: 'bank_transfer' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back and releases on unexpected error', async () => {
      const qr = makeQueryRunner();
      qr.manager.save.mockRejectedValue(new Error('DB write error'));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.recharge({ user_id: 1, amount: 100, payment_method: 'credit_card' }),
      ).rejects.toThrow('DB write error');

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateBalance ───────────────────────────────────────────────────────────

  describe('updateBalance - debit', () => {
    it('subtracts amount from balance', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 500 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.updateBalance({
        user_id: 1,
        amount: 200,
        operation: 'debit',
      });

      expect(result.previous_balance).toBe(500);
      expect(result.new_balance).toBe(300);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('allows exact balance debit (boundary condition)', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 100 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.updateBalance({
        user_id: 1,
        amount: 100,
        operation: 'debit',
      });

      expect(result.new_balance).toBe(0);
    });

    it('throws 409 Conflict when balance is insufficient', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 50 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.updateBalance({ user_id: 1, amount: 100, operation: 'debit' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws 404 and rolls back when user is not found', async () => {
      const qr = makeQueryRunner(null);
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.updateBalance({ user_id: 99, amount: 100, operation: 'debit' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBalance - credit', () => {
    it('adds amount to balance', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 100 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.updateBalance({
        user_id: 1,
        amount: 75,
        operation: 'credit',
      });

      expect(result.previous_balance).toBe(100);
      expect(result.new_balance).toBe(175);
    });

    it('credits to an account with zero balance', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 0 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.updateBalance({
        user_id: 1,
        amount: 250,
        operation: 'credit',
      });

      expect(result.new_balance).toBe(250);
    });

    it('rolls back and releases on unexpected error during credit', async () => {
      const qr = makeQueryRunner(makeUser({ balance: 100 }));
      qr.manager.save.mockRejectedValue(new Error('Disk full'));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.updateBalance({ user_id: 1, amount: 50, operation: 'credit' }),
      ).rejects.toThrow('Disk full');

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });
  });
});
