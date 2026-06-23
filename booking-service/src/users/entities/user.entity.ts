import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  COLABORADOR = 'COLABORADOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'varchar', default: UserRole.COLABORADOR })
  role: UserRole;
}
