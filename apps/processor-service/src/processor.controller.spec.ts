import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProcessorController } from './processor.controller';
import { ProcessorService } from './processor.service';
import { TransactionStatus } from './entities/transaction.entity';

// ─── Mock del servicio ────────────────────────────────────────────────────────

const mockProcessorService = {
  transfer: jest.fn(),
  getTransactionHistory: jest.fn(),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ProcessorController', () => {
  let controller: ProcessorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessorController],
      providers: [{ provide: ProcessorService, useValue: mockProcessorService }],
    }).compile();

    controller = module.get<ProcessorController>(ProcessorController);
    jest.clearAllMocks();
  });

  // ── health ──────────────────────────────────────────────────────────────────

  describe('health', () => {
    it('returns status ok with correct service name', () => {
      const result = controller.health();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('processor-service');
      expect(result).toHaveProperty('timestamp');
    });
  });

  // ── transfer ────────────────────────────────────────────────────────────────

  describe('transfer', () => {
    it('delegates to ProcessorService and returns COMPLETED result', async () => {
      const dto = { sender_id: 1, receiver_id: 2, amount: 100 };
      const serviceResult = {
        transaction_id: 1,
        status: TransactionStatus.COMPLETED,
        sender_id: 1,
        receiver_id: 2,
        amount: 100,
        message: 'Transferencia completada exitosamente',
      };
      mockProcessorService.transfer.mockResolvedValue(serviceResult);

      const result = await controller.transfer(dto);

      expect(result).toEqual(serviceResult);
      expect(mockProcessorService.transfer).toHaveBeenCalledWith(dto);
    });

    it('propagates 400 HttpException for self-transfer', async () => {
      mockProcessorService.transfer.mockRejectedValue(
        new HttpException(
          { error: 'self_transfer_not_allowed' },
          HttpStatus.BAD_REQUEST,
        ),
      );

      await expect(
        controller.transfer({ sender_id: 1, receiver_id: 1, amount: 100 }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('propagates 409 HttpException for insufficient funds', async () => {
      mockProcessorService.transfer.mockRejectedValue(
        new HttpException({ error: 'insufficient_funds' }, HttpStatus.CONFLICT),
      );

      await expect(
        controller.transfer({ sender_id: 2, receiver_id: 1, amount: 9999 }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });

    it('propagates 422 HttpException when Saga rolls back', async () => {
      mockProcessorService.transfer.mockRejectedValue(
        new HttpException(
          { error: 'transfer_failed_rolled_back', transaction_id: 5 },
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );

      await expect(
        controller.transfer({ sender_id: 1, receiver_id: 2, amount: 100 }),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
    });
  });

  // ── getTransactionHistory ───────────────────────────────────────────────────

  describe('getTransactionHistory', () => {
    it('delegates to ProcessorService and returns history with type field', async () => {
      const history = [
        {
          id: 1,
          senderId: 1,
          receiverId: 2,
          amount: 100,
          status: TransactionStatus.COMPLETED,
          type: 'sent',
        },
        {
          id: 2,
          senderId: 3,
          receiverId: 1,
          amount: 50,
          status: TransactionStatus.COMPLETED,
          type: 'received',
        },
      ];
      mockProcessorService.getTransactionHistory.mockResolvedValue(history);

      const result = await controller.getTransactionHistory(1);

      expect(result).toEqual(history);
      expect(mockProcessorService.getTransactionHistory).toHaveBeenCalledWith(1);
    });

    it('returns empty array when user has no transactions', async () => {
      mockProcessorService.getTransactionHistory.mockResolvedValue([]);

      const result = await controller.getTransactionHistory(99);

      expect(result).toHaveLength(0);
      expect(mockProcessorService.getTransactionHistory).toHaveBeenCalledWith(99);
    });
  });
});
