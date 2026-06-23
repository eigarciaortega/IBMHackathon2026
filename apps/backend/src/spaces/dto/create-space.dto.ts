import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceStatus } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Creación de espacio por ADMIN (CU-010 / RN-018).
 */
export class CreateSpaceDto {
  @ApiProperty({ example: 'Sala Creativa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'Meeting Room Medium' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  spaceType!: string;

  @ApiProperty({ example: 8, description: 'Capacidad > 0 (RN-025)' })
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity!: number;

  @ApiProperty({ example: 'Piso 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor!: string;

  @ApiProperty({ example: 'Norte' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  zone!: string;

  @ApiPropertyOptional({ example: 'Sala con pizarrón y proyector' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SpaceStatus, default: SpaceStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @ApiPropertyOptional({ type: [String], description: 'IDs de recursos a asociar' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  resourceIds?: string[];
}
