import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

// ─── Mock del servicio ────────────────────────────────────────────────────────

const mockAccountsService = {
  getAccount: jest.fn(),
  recharge: jest.fn(),
  updateBalance: jest.fn(),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AccountsController', () => {
  let controller: AccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: mockAccountsService }],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    jest.clearAllMocks();
  });

  // ── health ──────────────────────────────────────────────────────────────────

  describe('health', () => {
    it('returns status ok with correct service name', () => {
      const result = controller.health();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('accounts-service');
      expect(result).toHaveProperty('timestamp');
    });
  });

  // ── getAccount ──────────────────────────────────────────────────────────────

  describe('getAccount', () => {
    it('delegates to AccountsService and returns the user', async () => {
      const user = { id: 1, name: 'Test', balance: 500 };
      mockAccountsService.getAccount.mockResolvedValue(user);

      const result = await controller.getAccount(1);

      expect(result).toEqual(user);
      expect(mockAccountsService.getAccount).toHaveBeenCalledWith(1);
    });

    it('propagates NotFoundException from the service', async () => {
      mockAccountsService.getAccount.mockRejectedValue(new NotFoundException());

      await expect(controller.getAccount(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── recharge ────────────────────────────────────────────────────────────────

  describe('recharge', () => {
    it('calls service and returns result for a valid amount', async () => {
      const dto = { user_id: 1, amount: 200, payment_method: 'credit_card' };
      const serviceResult = { user_id: 1, new_balance: 700, payment_method: 'credit_card' };
      mockAccountsService.recharge.mockResolvedValue(serviceResult);

      const result = await controller.recharge(dto);

      expect(result).toEqual(serviceResult);
      expect(mockAccountsService.recharge).toHaveBeenCalledWith(dto);
    });

    it('throws BadRequestException and does NOT call service when amount is 0', async () => {
      const dto = { user_id: 1, amount: 0, payment_method: 'credit_card' };

      await expect(controller.recharge(dto)).rejects.toThrow(BadRequestException);
      expect(mockAccountsService.recharge).not.toHaveBeenCalled();
    });

    it('throws BadRequestException and does NOT call service when amount is negative', async () => {
      const dto = { user_id: 1, amount: -100, payment_method: 'credit_card' };

      await expect(controller.recharge(dto)).rejects.toThrow(BadRequestException);
      expect(mockAccountsService.recharge).not.toHaveBeenCalled();
    });

    it('propagates HttpException from the service (e.g. user not found)', async () => {
      const dto = { user_id: 99, amount: 100, payment_method: 'bank_transfer' };
      mockAccountsService.recharge.mockRejectedValue(
        new HttpException({ error: 'user_not_found' }, HttpStatus.NOT_FOUND),
      );

      await expect(controller.recharge(dto)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  // ── updateBalance ───────────────────────────────────────────────────────────

  describe('updateBalance', () => {
    it('delegates debit to AccountsService', async () => {
      const dto = { user_id: 1, amount: 100, operation: 'debit' as const };
      const serviceResult = { user_id: 1, previous_balance: 500, new_balance: 400 };
      mockAccountsService.updateBalance.mockResolvedValue(serviceResult);

      const result = await controller.updateBalance(dto);

      expect(result).toEqual(serviceResult);
      expect(mockAccountsService.updateBalance).toHaveBeenCalledWith(dto);
    });

    it('delegates credit to AccountsService', async () => {
      const dto = { user_id: 2, amount: 50, operation: 'credit' as const };
      mockAccountsService.updateBalance.mockResolvedValue({
        user_id: 2,
        previous_balance: 100,
        new_balance: 150,
      });

      await controller.updateBalance(dto);

      expect(mockAccountsService.updateBalance).toHaveBeenCalledWith(dto);
    });

    it('propagates 409 Conflict when service throws insufficient_funds', async () => {
      mockAccountsService.updateBalance.mockRejectedValue(
        new HttpException({ error: 'insufficient_funds' }, HttpStatus.CONFLICT),
      );

      await expect(
        controller.updateBalance({ user_id: 1, amount: 9999, operation: 'debit' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });
  });
});
