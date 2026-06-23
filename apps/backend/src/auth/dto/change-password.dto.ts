import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Cambio de contraseña (decisión H-01 / S-04).
 * Política mínima: 8+ caracteres, al menos una mayúscula y un número.
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'Admin123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPass2026', description: 'Mín. 8, una mayúscula y un número' })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe incluir al menos una mayúscula y un número.',
  })
  newPassword!: string;
}
