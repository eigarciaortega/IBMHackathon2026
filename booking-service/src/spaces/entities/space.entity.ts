import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SpaceType {
  SALA = 'SALA',
  DESK = 'DESK',
}

@Entity('spaces')
export class Space {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Sala Creativa A' })
  @Column()
  name: string;

  @ApiProperty({ enum: SpaceType })
  @Column({ type: 'varchar' })
  type: SpaceType;

  @ApiProperty({ example: 8 })
  @Column()
  capacity: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true, default: {} })
  resources: Record<string, boolean>;

  @ApiProperty({ example: 'Piso 3 - Ala Norte' })
  @Column()
  location: string;

  @Column({ type: 'boolean', default: false })
  is_under_maintenance: boolean;

  @Column({ type: 'timestamp', nullable: true })
  maintenance_until: Date | null;

  @Column({ type: 'varchar', nullable: true })
  maintenance_reason: string | null;
}
