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

  @ApiProperty({ enum: SpaceType, example: SpaceType.SALA })
  @Column({ type: 'varchar' })
  type: SpaceType;

  @ApiProperty({ example: 8, description: 'Capacidad máxima de personas' })
  @Column()
  capacity: number;

  @ApiProperty({
    example: { projector: true, air_conditioning: true, whiteboard: false },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true, default: {} })
  resources: Record<string, boolean>;

  @ApiProperty({ example: 'Piso 3 - Ala Norte' })
  @Column()
  location: string;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  is_under_maintenance: boolean;

  @ApiProperty({ example: null, nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  maintenance_until: Date | null;

  @ApiProperty({ example: null, nullable: true })
  @Column({ type: 'varchar', nullable: true })
  maintenance_reason: string | null;
}
