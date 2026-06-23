import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResourceDto {
  @ApiPropertyOptional({ example: 'Projector' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Proyector 4K' })
  @IsOptional()
  @IsString()
  description?: string;
}
