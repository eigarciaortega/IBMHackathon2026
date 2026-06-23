import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  private readonly accountsServiceUrl: string;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly httpService: HttpService,
  ) {
    this.accountsServiceUrl =
      process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:3000';
  }

  // Llama al endpoint interno de accounts-service con manejo de error tipado
  private async callUpdateBalance(
    userId: number,
    amount: number,
    operation: 'debit' | 'credit',
  ): Promise<void> {
    try {
      await lastValueFrom(
        this.httpService.post(
          `${this.accountsServiceUrl}/accounts/update-balance`,
          { user_id: userId, amount, operation },
        ),
      );
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          error.response.data ?? { message: 'Error en accounts-service' },
          error.response.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        {
          error: 'service_unavailable',
          message: 'Accounts Service no disponible. Intenta más tarde.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async transfer(dto: TransferDto): Promise<{
    transaction_id: number;
    status: TransactionStatus;
    sender_id: number;
    receiver_id: number;
    amount: number;
    message: string;
  }> {
    const { sender_id, receiver_id, amount } = dto;

    if (sender_id === receiver_id) {
      throw new HttpException(
        {
          error: 'self_transfer_not_allowed',
          message: 'No puedes transferirte dinero a ti mismo',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (amount <= 0) {
      throw new HttpException(
        { error: 'invalid_amount', message: 'El monto debe ser mayor a 0' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── SAGA STEP 1: Crear transacción en estado PENDING ──────────────────────
    const transaction = this.transactionRepository.create({
      senderId: sender_id,
      receiverId: receiver_id,
      amount,
      status: TransactionStatus.PENDING,
    });
    await this.transactionRepository.save(transaction);

    this.logger.log(
      `[SAGA:${transaction.id}] PENDING | sender=${sender_id} receiver=${receiver_id} amount=${amount}`,
    );

    // ── SAGA STEP 2: Debitar al sender ────────────────────────────────────────
    try {
      await this.callUpdateBalance(sender_id, amount, 'debit');
    } catch (debitError) {
      const errMsg =
        debitError?.response?.message ??
        debitError?.message ??
        'Fallo al debitar al sender';

      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.FAILED,
        errorMessage: errMsg,
      });

      this.logger.error(
        `[SAGA:${transaction.id}] FAILED en paso DEBIT | ${errMsg}`,
      );

      throw debitError;
    }

    // ── SAGA STEP 3: Marcar como DEBITED ─────────────────────────────────────
    await this.transactionRepository.update(transaction.id, {
      status: TransactionStatus.DEBITED,
    });

    this.logger.log(
      `[SAGA:${transaction.id}] DEBITED | sender=${sender_id} descontado $${amount}`,
    );

    // ── SAGA STEP 4: Acreditar al receiver ────────────────────────────────────
    try {
      await this.callUpdateBalance(receiver_id, amount, 'credit');
    } catch (creditError) {
      const creditErrMsg =
        creditError?.response?.message ??
        creditError?.message ??
        'Fallo al acreditar al receiver';

      this.logger.warn(
        `[SAGA:${transaction.id}] Crédito FALLIDO. Iniciando compensación... | ${creditErrMsg}`,
      );

      // ── COMPENSACIÓN: Devolver dinero al sender ───────────────────────────
      try {
        await this.callUpdateBalance(sender_id, amount, 'credit');

        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.ROLLED_BACK,
          errorMessage: creditErrMsg,
        });

        this.logger.log(
          `[SAGA:${transaction.id}] ROLLED_BACK | Compensación exitosa. Dinero devuelto al sender=${sender_id}`,
        );
      } catch (compensationError) {
        // Estado crítico: el débito ocurrió pero ni el crédito ni la compensación funcionaron.
        // Requiere intervención manual. El dinero NO se perdió — está en el estado de la BD.
        const criticalMsg = `CRITICAL: Compensación FALLIDA. sender=${sender_id} perdió $${amount}. Intervención manual requerida. Credit error: ${creditErrMsg}. Compensation error: ${compensationError?.message}`;

        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.FAILED,
          errorMessage: criticalMsg,
        });

        this.logger.error(`[SAGA:${transaction.id}] ${criticalMsg}`);

        throw new HttpException(
          {
            error: 'critical_compensation_failure',
            message:
              'Error crítico del sistema. Contacta soporte con el transaction_id.',
            transaction_id: transaction.id,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          error: 'transfer_failed_rolled_back',
          message:
            'La transferencia falló al acreditar al receptor. El débito fue revertido exitosamente.',
          transaction_id: transaction.id,
          status: TransactionStatus.ROLLED_BACK,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // ── SAGA STEP 5: Marcar como COMPLETED ───────────────────────────────────
    await this.transactionRepository.update(transaction.id, {
      status: TransactionStatus.COMPLETED,
    });

    this.logger.log(
      `[SAGA:${transaction.id}] COMPLETED | sender=${sender_id} → receiver=${receiver_id} $${amount}`,
    );

    return {
      transaction_id: transaction.id,
      status: TransactionStatus.COMPLETED,
      sender_id,
      receiver_id,
      amount: Number(amount),
      message: 'Transferencia completada exitosamente',
    };
  }

  async getTransactionHistory(userId: number): Promise<
    (Transaction & { type: 'sent' | 'received' })[]
  > {
    const transactions = await this.transactionRepository.find({
      where: [{ senderId: userId }, { receiverId: userId }],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((tx) => ({
      ...tx,
      type: tx.senderId === userId ? 'sent' : 'received',
    }));
  }
}
