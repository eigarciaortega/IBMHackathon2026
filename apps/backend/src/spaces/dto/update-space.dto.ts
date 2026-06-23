import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Actualización de espacio por ADMIN (CU-011). El estado se cambia por
 * PATCH /spaces/:id/status (no aquí).
 */
export class UpdateSpaceDto {
  @ApiPropertyOptional({ example: 'Sala Creativa' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Meeting Room Large' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  spaceType?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Piso 2' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @ApiPropertyOptional({ example: 'Sur' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Reemplaza las asociaciones de recursos' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  resourceIds?: string[];
}
