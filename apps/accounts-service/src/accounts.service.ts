import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { RechargeDto } from './dto/recharge.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getAccount(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        error: 'user_not_found',
        message: `Usuario con ID ${id} no encontrado`,
      });
    }

    return user;
  }

  async recharge(
    dto: RechargeDto,
  ): Promise<{ user_id: number; new_balance: number; payment_method: string }> {
    const { user_id, amount, payment_method } = dto;

    if (amount <= 0) {
      throw new HttpException(
        { error: 'invalid_amount', message: 'El monto debe ser mayor a 0' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: user_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new HttpException(
          {
            error: 'user_not_found',
            message: `Usuario con ID ${user_id} no encontrado`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const previousBalance = Number(user.balance);
      user.balance = Number((previousBalance + amount).toFixed(2));

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      this.logger.log(
        `[RECHARGE] user_id=${user_id} method=${payment_method} amount=${amount} prev=${previousBalance} new=${user.balance}`,
      );

      return {
        user_id: user.id,
        new_balance: Number(user.balance),
        payment_method,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBalance(
    dto: UpdateBalanceDto,
  ): Promise<{ user_id: number; previous_balance: number; new_balance: number }> {
    const { user_id, amount, operation } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pessimistic Write Lock: previene race conditions en débitos concurrentes
      const user = await queryRunner.manager.findOne(User, {
        where: { id: user_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new HttpException(
          {
            error: 'user_not_found',
            message: `Usuario con ID ${user_id} no encontrado`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const previousBalance = Number(user.balance);

      if (operation === 'debit') {
        if (previousBalance < amount) {
          throw new HttpException(
            {
              error: 'insufficient_funds',
              message: `Saldo insuficiente. Disponible: $${previousBalance.toFixed(2)}, Requerido: $${amount.toFixed(2)}`,
            },
            HttpStatus.CONFLICT,
          );
        }
        user.balance = Number((previousBalance - amount).toFixed(2));
      } else {
        user.balance = Number((previousBalance + amount).toFixed(2));
      }

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      this.logger.log(
        `[UPDATE_BALANCE] user_id=${user_id} op=${operation} amount=${amount} prev=${previousBalance} new=${user.balance}`,
      );

      return {
        user_id: user.id,
        previous_balance: previousBalance,
        new_balance: Number(user.balance),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
