import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Consulta al Bot FAQ (POST /chatbot/ask). Sin IA.
 */
export class AskDto {
  @ApiProperty({ example: '¿Cómo reservo un espacio?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  question!: string;
}
