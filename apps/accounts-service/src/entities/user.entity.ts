import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({ example: 1, description: 'ID único del usuario' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Usuario A (Rico)', description: 'Nombre completo' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ example: 'usuario.a@neowallet.com', description: 'Email único' })
  @Column({ length: 100, unique: true })
  email: string;

  @ApiProperty({ example: 1000.0, description: 'Saldo actual (nunca negativo)' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  balance: number;

  @ApiProperty({ example: '2026-06-22T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-22T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
