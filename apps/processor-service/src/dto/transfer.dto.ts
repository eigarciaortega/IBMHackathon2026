import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsInt } from 'class-validator';

export class TransferDto {
  @ApiProperty({
    example: 1,
    description: 'ID del usuario que envía el dinero (sender)',
  })
  @IsInt()
  @IsPositive()
  sender_id: number;

  @ApiProperty({
    example: 2,
    description: 'ID del usuario que recibe el dinero (receiver). Debe ser distinto al sender.',
  })
  @IsInt()
  @IsPositive()
  receiver_id: number;

  @ApiProperty({
    example: 100.0,
    description: 'Monto a transferir. Debe ser mayor a 0.',
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
