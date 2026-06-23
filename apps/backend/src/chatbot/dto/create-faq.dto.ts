import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { FAQ_CATEGORIES, FaqCategory } from '../constants/faq.constants';

/**
 * Crear FAQ (solo ADMIN).
 */
export class CreateFaqDto {
  @ApiProperty({ example: '¿Cómo reservo un espacio?' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ example: 'Ve a Buscar Espacios, elige fecha y horario y confirma.' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiProperty({ enum: FAQ_CATEGORIES, example: 'Reservations' })
  @IsIn(FAQ_CATEGORIES)
  category!: FaqCategory;
}
