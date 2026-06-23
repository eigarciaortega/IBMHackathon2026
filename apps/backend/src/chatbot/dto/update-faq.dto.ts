import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { FAQ_CATEGORIES, FaqCategory } from '../constants/faq.constants';

/**
 * Actualizar FAQ (solo ADMIN).
 */
export class UpdateFaqDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({ enum: FAQ_CATEGORIES })
  @IsOptional()
  @IsIn(FAQ_CATEGORIES)
  category?: FaqCategory;
}
