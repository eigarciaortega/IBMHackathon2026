import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsIn } from 'class-validator';

export class UpdateBalanceDto {
  @ApiProperty({
    example: 1,
    description: 'ID del usuario cuyo balance se actualizará',
  })
  @IsNumber()
  @IsPositive()
  user_id: number;

  @ApiProperty({
    example: 100.0,
    description: 'Monto de la operación. Debe ser mayor a 0.',
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    enum: ['debit', 'credit'],
    example: 'debit',
    description: 'Tipo de operación: "debit" resta saldo, "credit" suma saldo.',
  })
  @IsIn(['debit', 'credit'])
  operation: 'debit' | 'credit';
}
