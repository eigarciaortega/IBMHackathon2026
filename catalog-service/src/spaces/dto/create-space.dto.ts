import { IsString, IsEnum, IsInt, Min, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceType } from '../entities/space.entity';

export class CreateSpaceDto {
  @ApiProperty({ example: 'Sala Creativa A' })
  @IsString()
  name: string;

  @ApiProperty({ enum: SpaceType, example: SpaceType.SALA })
  @IsEnum(SpaceType)
  type: SpaceType;

  @ApiProperty({ example: 8, description: 'Capacidad máxima de personas' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    example: { projector: true, air_conditioning: false, whiteboard: true },
    description: 'Recursos disponibles en el espacio',
  })
  @IsObject()
  @IsOptional()
  resources?: Record<string, boolean>;

  @ApiProperty({ example: 'Piso 3 - Ala Norte' })
  @IsString()
  location: string;
}
