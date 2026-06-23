import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Role, RoleName } from '../../common/constants/roles.constant';

/**
 * Creación de usuario por ADMIN (decisión H-01).
 * NO recibe contraseña: el sistema genera una temporal.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Méndez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'carlos.mendez@corporativoalpha.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ enum: [Role.ADMIN, Role.COLLABORATOR], example: Role.COLLABORATOR })
  @IsIn([Role.ADMIN, Role.COLLABORATOR])
  role!: RoleName;
}
