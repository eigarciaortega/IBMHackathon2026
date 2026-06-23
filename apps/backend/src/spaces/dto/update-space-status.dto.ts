import { ApiProperty } from '@nestjs/swagger';
import { SpaceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Cambio de estado de espacio (RN-023): AVAILABLE / MAINTENANCE / INACTIVE.
 * Restricción H-05 aplicada en el servicio.
 */
export class UpdateSpaceStatusDto {
  @ApiProperty({ enum: SpaceStatus, example: SpaceStatus.MAINTENANCE })
  @IsEnum(SpaceStatus)
  status!: SpaceStatus;
}
