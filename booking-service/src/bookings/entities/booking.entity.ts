import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Space } from '../../spaces/entities/space.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bookings')
export class Booking {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID del espacio reservado' })
  @Column()
  space_id: number;

  @ApiProperty({ example: 2, description: 'ID del usuario que reservó' })
  @Column()
  user_id: number;

  @ApiProperty({ example: '2026-06-24T09:00:00.000Z' })
  @Column({ type: 'timestamp' })
  start_time: Date;

  @ApiProperty({ example: '2026-06-24T10:00:00.000Z' })
  @Column({ type: 'timestamp' })
  end_time: Date;

  @ApiProperty({ example: 4, description: 'Número de asistentes' })
  @Column()
  attendees: number;

  @ApiProperty({ example: 'CONFIRMED', enum: ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED'] })
  @Column({ type: 'varchar', default: 'CONFIRMED' })
  status: string;

  @ApiProperty({ example: null, nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  checked_in_at: Date | null;

  @ManyToOne(() => Space, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
