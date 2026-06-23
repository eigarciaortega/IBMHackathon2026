import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Matches, Min } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Validación previa de disponibilidad sin crear la reserva (POST /bookings/validate).
 */
export class ValidateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  spaceId!: string;

  @ApiProperty({ example: '2026-07-01' })
  @Matches(DATE_REGEX, { message: 'date debe tener formato YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_REGEX, { message: 'startTime inválido (HH:mm)' })
  startTime!: string;

  @ApiProperty({ example: '10:00' })
  @Matches(TIME_REGEX, { message: 'endTime inválido (HH:mm)' })
  endTime!: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attendeesCount!: number;
}
