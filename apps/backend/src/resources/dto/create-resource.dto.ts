import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Creación de recurso por ADMIN.
 */
export class CreateResourceDto {
  @ApiProperty({ example: 'Projector' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Proyector full HD' })
  @IsOptional()
  @IsString()
  description?: string;
}
