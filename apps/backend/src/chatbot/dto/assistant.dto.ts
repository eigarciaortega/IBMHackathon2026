import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AssistantContextDto {
  @ApiPropertyOptional({ example: 'ADMIN', enum: ['ADMIN', 'COLLABORATOR'] })
  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'COLLABORATOR'])
  role?: 'ADMIN' | 'COLLABORATOR';

  @ApiPropertyOptional({ example: '/dashboard' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPage?: string;
}

/**
 * Petición al OfficeSpace Assistant. El contexto es opcional; si no llega rol,
 * el backend lo deriva del JWT.
 */
export class AssistantRequestDto {
  @ApiProperty({ example: 'Quiero reservar una sala' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({ type: AssistantContextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AssistantContextDto)
  context?: AssistantContextDto;
}

// --- Respuesta (solo para documentación Swagger) ---
class AssistantSuggestionDto {
  @ApiProperty({ example: 'Ver salas disponibles' }) label!: string;
  @ApiProperty({ example: 'ver salas disponibles' }) message!: string;
}
class AssistantActionDto {
  @ApiProperty({ example: 'NAVIGATE', enum: ['NAVIGATE', 'NONE'] }) type!: string;
  @ApiPropertyOptional({ example: '/spaces' }) target?: string;
}
export class AssistantResponseDto {
  @ApiProperty({ example: 'Claro, puedes iniciar una reserva seleccionando un espacio disponible.' })
  answer!: string;
  @ApiProperty({ type: [AssistantSuggestionDto] }) suggestions!: AssistantSuggestionDto[];
  @ApiPropertyOptional({ type: AssistantActionDto }) action?: AssistantActionDto;
  @ApiProperty({ example: 'local', enum: ['local', 'watson'], description: 'Motor que resolvió la respuesta' })
  engine!: string;
}
