import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ProcessorService } from './processor.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

// ─── Helpers para mocks de HTTP ───────────────────────────────────────────────

/** Simula una respuesta HTTP exitosa del accounts-service */
const httpOk = () =>
  of({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} as any });

/** Simula un error HTTP del accounts-service (estilo AxiosError) */
const httpError = (status: number, data: any) => {
  const err: any = new Error('Request failed');
  err.response = { status, data };
  return throwError(() => err);
};

/** Simula un error de red (sin .response, e.g. ECONNREFUSED) */
const networkError = () => throwError(() => new Error('ECONNREFUSED'));

// ─── Fixture de transacción ───────────────────────────────────────────────────

const makeTx = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 42,
    senderId: 1,
    receiverId: 2,
    amount: 100,
    status: TransactionStatus.PENDING,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ProcessorService', () => {
  let service: ProcessorService;
  let mockHttpService: { post: jest.Mock };
  let mockRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockHttpService = { post: jest.fn() };
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessorService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: getRepositoryToken(Transaction), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProcessorService>(ProcessorService);
  });

  // ── transfer — validaciones iniciales ─────────────────────────────────────

  describe('transfer - validaciones de input', () => {
    it('throws 400 self_transfer_not_allowed when sender === receiver', async () => {
      await expect(
        service.transfer({ sender_id: 1, receiver_id: 1, amount: 100 }),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: expect.objectContaining({ error: 'self_transfer_not_allowed' }),
      });

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws 400 invalid_amount when amount is zero', async () => {
      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 0 }),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: expect.objectContaining({ error: 'invalid_amount' }),
      });
    });

    it('throws 400 invalid_amount when amount is negative', async () => {
      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: -50 }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  // ── transfer — Happy Path ──────────────────────────────────────────────────

  describe('transfer - Happy Path', () => {
    it('completes successfully: PENDING → DEBITED → COMPLETED', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      // Llamada 1: debit sender, Llamada 2: credit receiver
      mockHttpService.post.mockReturnValue(httpOk());

      const result = await service.transfer({
        sender_id: 1,
        receiver_id: 2,
        amount: 100,
      });

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.transaction_id).toBe(42);
      expect(result.sender_id).toBe(1);
      expect(result.receiver_id).toBe(2);
      expect(result.amount).toBe(100);

      // Verificar la secuencia exacta de estados del Saga
      expect(mockRepo.update).toHaveBeenNthCalledWith(
        1,
        42,
        { status: TransactionStatus.DEBITED },
      );
      expect(mockRepo.update).toHaveBeenNthCalledWith(
        2,
        42,
        { status: TransactionStatus.COMPLETED },
      );

      // Exactamente 2 llamadas HTTP: debit + credit
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('calls accounts-service with correct payload for debit and credit', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockHttpService.post.mockReturnValue(httpOk());

      await service.transfer({ sender_id: 5, receiver_id: 7, amount: 250 });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/update-balance'),
        { user_id: 5, amount: 250, operation: 'debit' },
      );
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/update-balance'),
        { user_id: 7, amount: 250, operation: 'credit' },
      );
    });
  });

  // ── transfer — Fallo en paso DEBIT ────────────────────────────────────────

  describe('transfer - fallo en DEBIT (SAGA: PENDING → FAILED)', () => {
    it('marks transaction FAILED when debit returns 409 insufficient_funds', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockHttpService.post.mockReturnValue(
        httpError(HttpStatus.CONFLICT, {
          error: 'insufficient_funds',
          message: 'Saldo insuficiente',
        }),
      );

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 999 }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });

      // Solo la primera update (FAILED), sin llegar a DEBITED ni COMPLETED
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(mockRepo.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      );

      // Solo 1 llamada HTTP (el debit que falló); no se intentó el credit
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('marks FAILED and propagates 503 when accounts-service is unreachable during debit', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockHttpService.post.mockReturnValue(networkError());

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 100 }),
      ).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });

      expect(mockRepo.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      );
    });
  });

  // ── transfer — Fallo en CREDIT con compensación exitosa ───────────────────

  describe('transfer - fallo en CREDIT + compensación exitosa (SAGA: ROLLED_BACK)', () => {
    it('rolls back and marks ROLLED_BACK when credit fails but compensation succeeds', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      mockHttpService.post
        .mockReturnValueOnce(httpOk())                                 // debit sender  → OK
        .mockReturnValueOnce(httpError(500, { message: 'DB down' }))  // credit receiver → FAIL
        .mockReturnValueOnce(httpOk());                                // compensación credit sender → OK

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 100 }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: expect.objectContaining({ error: 'transfer_failed_rolled_back' }),
      });

      // Secuencia de estados: DEBITED → ROLLED_BACK
      expect(mockRepo.update).toHaveBeenCalledWith(42, { status: TransactionStatus.DEBITED });
      expect(mockRepo.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: TransactionStatus.ROLLED_BACK }),
      );

      // 3 llamadas HTTP: debit + credit (falla) + compensación
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    });

    it('returns transaction_id in the 422 error body for traceability', async () => {
      const tx = makeTx({ id: 77 });
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      mockHttpService.post
        .mockReturnValueOnce(httpOk())
        .mockReturnValueOnce(httpError(503, { message: 'Timeout' }))
        .mockReturnValueOnce(httpOk());

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 50 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ transaction_id: 77 }),
      });
    });
  });

  // ── transfer — Fallo en CREDIT + compensación también falla ──────────────

  describe('transfer - fallo en CREDIT + compensación FALLIDA (SAGA: estado crítico)', () => {
    it('marks FAILED with CRITICAL message when both credit and compensation fail', async () => {
      const tx = makeTx();
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      mockHttpService.post
        .mockReturnValueOnce(httpOk())                                      // debit → OK
        .mockReturnValueOnce(httpError(500, { message: 'Credit failed' })) // credit → FAIL
        .mockReturnValueOnce(httpError(500, { message: 'Comp failed' }));  // compensación → FAIL

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 100 }),
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: expect.objectContaining({ error: 'critical_compensation_failure' }),
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      );
      // Todas las 3 llamadas HTTP se ejecutaron
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    });

    it('includes transaction_id in critical 500 error for manual intervention', async () => {
      const tx = makeTx({ id: 99 });
      mockRepo.create.mockReturnValue(tx);
      mockRepo.save.mockResolvedValue(tx);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      mockHttpService.post
        .mockReturnValueOnce(httpOk())
        .mockReturnValueOnce(httpError(500, {}))
        .mockReturnValueOnce(httpError(500, {}));

      await expect(
        service.transfer({ sender_id: 1, receiver_id: 2, amount: 100 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ transaction_id: 99 }),
      });
    });
  });

  // ── getTransactionHistory ─────────────────────────────────────────────────

  describe('getTransactionHistory', () => {
    it('labels senderId transactions as type=sent', async () => {
      const tx = makeTx({ senderId: 1, receiverId: 2 });
      mockRepo.find.mockResolvedValue([tx]);

      const result = await service.getTransactionHistory(1);

      expect(result[0].type).toBe('sent');
    });

    it('labels receiverId transactions as type=received', async () => {
      const tx = makeTx({ senderId: 3, receiverId: 1 });
      mockRepo.find.mockResolvedValue([tx]);

      const result = await service.getTransactionHistory(1);

      expect(result[0].type).toBe('received');
    });

    it('returns empty array when the user has no transactions', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getTransactionHistory(1);

      expect(result).toHaveLength(0);
    });

    it('calls repository with both sender and receiver conditions', async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.getTransactionHistory(5);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: [{ senderId: 5 }, { receiverId: 5 }],
        order: { createdAt: 'DESC' },
      });
    });

    it('handles mixed sent and received transactions correctly', async () => {
      const sent = makeTx({ id: 1, senderId: 1, receiverId: 2 });
      const received = makeTx({ id: 2, senderId: 3, receiverId: 1 });
      mockRepo.find.mockResolvedValue([sent, received]);

      const result = await service.getTransactionHistory(1);

      expect(result.find((t) => t.id === 1).type).toBe('sent');
      expect(result.find((t) => t.id === 2).type).toBe('received');
    });
  });
});
