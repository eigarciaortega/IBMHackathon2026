import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { FAQ_CATEGORIES, FaqCategory } from '../constants/faq.constants';

/**
 * Filtros para GET /chatbot/faq.
 */
export class QueryFaqDto {
  @ApiPropertyOptional({ enum: FAQ_CATEGORIES })
  @IsOptional()
  @IsIn(FAQ_CATEGORIES)
  category?: FaqCategory;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
