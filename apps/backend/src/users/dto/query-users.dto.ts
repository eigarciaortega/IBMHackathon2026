import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Role, RoleName } from '../../common/constants/roles.constant';

/**
 * Filtros validados para GET /users (ajuste menor solicitado en revisión Fase 5).
 */
export class QueryUsersDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: [Role.ADMIN, Role.COLLABORATOR] })
  @IsOptional()
  @IsIn([Role.ADMIN, Role.COLLABORATOR])
  role?: RoleName;

  @ApiPropertyOptional({ description: 'Busca en nombre, apellido o correo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
