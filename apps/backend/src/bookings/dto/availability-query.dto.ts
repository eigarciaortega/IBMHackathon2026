import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

/**
 * Query para GET /bookings/availability — sugiere horarios libres de un espacio
 * en una fecha, en horario laboral 08:00–18:00, intervalos de 30 min.
 */
export class AvailabilityQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  spaceId!: string;

  @ApiProperty({ example: '2026-07-01', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener formato YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ default: 60, description: 'Duración en minutos (default 60)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(480)
  durationMinutes?: number;
}
