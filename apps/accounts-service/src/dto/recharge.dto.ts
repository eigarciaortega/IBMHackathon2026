import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RechargeDto {
  @ApiProperty({
    example: 1,
    description: 'ID del usuario a recargar',
  })
  @IsNumber()
  @IsPositive()
  user_id: number;

  @ApiProperty({
    example: 100.0,
    description: 'Monto a recargar. Debe ser mayor a 0.',
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'credit_card',
    description: 'Método de pago simulado',
    enum: ['credit_card', 'debit_card', 'bank_transfer'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['credit_card', 'debit_card', 'bank_transfer'])
  payment_method: string;
}
