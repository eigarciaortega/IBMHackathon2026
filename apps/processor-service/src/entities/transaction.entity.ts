import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum TransactionStatus {
  PENDING = 'PENDING',
  DEBITED = 'DEBITED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

@Entity('transactions')
export class Transaction {
  @ApiProperty({ example: 1, description: 'ID único de la transacción' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID del usuario que envía' })
  @Column({ name: 'sender_id' })
  senderId: number;

  @ApiProperty({ example: 2, description: 'ID del usuario que recibe' })
  @Column({ name: 'receiver_id' })
  receiverId: number;

  @ApiProperty({ example: 100.0, description: 'Monto transferido' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
    description:
      'Estado actual: PENDING → DEBITED → COMPLETED | FAILED | ROLLED_BACK',
  })
  @Column({
    type: 'varchar',
    length: 20,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Mensaje de error en caso de fallo',
  })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ example: '2026-06-22T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-22T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
