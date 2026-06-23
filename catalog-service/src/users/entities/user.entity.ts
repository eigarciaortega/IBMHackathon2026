import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  COLABORADOR = 'COLABORADOR',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'admin@corporativoalpha.com' })
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.COLABORADOR })
  @Column({ type: 'varchar', default: UserRole.COLABORADOR })
  role: UserRole;
}
