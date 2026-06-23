import { IsInt, IsDateString, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'ID del espacio a reservar' })
  @IsInt()
  @IsPositive()
  space_id: number;

  @ApiProperty({
    example: '2026-06-24T09:00:00Z',
    description: 'Inicio de la reserva en formato ISO 8601',
  })
  @IsDateString()
  start_time: string;

  @ApiProperty({
    example: '2026-06-24T10:00:00Z',
    description: 'Fin de la reserva en formato ISO 8601. Debe ser mayor a start_time.',
  })
  @IsDateString()
  end_time: string;

  @ApiProperty({ example: 4, description: 'Número de asistentes (no puede superar la capacidad del espacio)' })
  @IsInt()
  @Min(1)
  attendees: number;
}
