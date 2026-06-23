import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Creación de reserva (CU-005). El motivo (purpose) es obligatorio (RN-035).
 */
export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  spaceId!: string;

  @ApiProperty({ example: '2026-07-01', description: 'YYYY-MM-DD' })
  @Matches(DATE_REGEX, { message: 'date debe tener formato YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: '09:00', description: 'HH:mm o HH:mm:ss' })
  @Matches(TIME_REGEX, { message: 'startTime inválido (HH:mm)' })
  startTime!: string;

  @ApiProperty({ example: '10:00', description: 'HH:mm o HH:mm:ss' })
  @Matches(TIME_REGEX, { message: 'endTime inválido (HH:mm)' })
  endTime!: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attendeesCount!: number;

  @ApiProperty({ example: 'Reunión de equipo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  purpose!: string;

  @ApiPropertyOptional({
    description: 'Si es true, la reserva se crea como solicitud recurrente PENDING_APPROVAL (requiere aprobación del administrador).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: '2026-07-01', description: 'Inicio del rango recurrente (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'recurrenceStartDate debe ser YYYY-MM-DD' })
  recurrenceStartDate?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Fin del rango recurrente (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'recurrenceEndDate debe ser YYYY-MM-DD' })
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'], example: 'WEEKLY' })
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}
