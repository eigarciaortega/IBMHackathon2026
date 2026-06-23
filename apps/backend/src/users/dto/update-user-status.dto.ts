import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Cambio de estado de usuario por ADMIN (RN-015): ACTIVE / INACTIVE / BLOCKED.
 */
export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
