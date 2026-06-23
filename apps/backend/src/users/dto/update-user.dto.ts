import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role, RoleName } from '../../common/constants/roles.constant';

/**
 * Actualización de datos de usuario por ADMIN.
 * No incluye email (clave única) ni contraseña (flujo aparte).
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Carlos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Méndez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ enum: [Role.ADMIN, Role.COLLABORATOR] })
  @IsOptional()
  @IsIn([Role.ADMIN, Role.COLLABORATOR])
  role?: RoleName;
}
