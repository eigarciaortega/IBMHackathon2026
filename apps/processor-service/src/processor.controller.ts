import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProcessorService } from './processor.service';
import { TransferDto } from './dto/transfer.dto';

@ApiTags('Processor')
@Controller()
export class ProcessorController {
  constructor(private readonly processorService: ProcessorService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio activo' })
  health() {
    return {
      status: 'ok',
      service: 'processor-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('api/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferir dinero entre usuarios (Patrón Saga)',
    description:
      'Orquesta una transferencia P2P usando el Patrón Saga. ' +
      'Flujo: PENDING → (debit sender) → DEBITED → (credit receiver) → COMPLETED. ' +
      'Si el crédito falla, compensa con credit al sender → ROLLED_BACK.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transferencia completada exitosamente (status: COMPLETED)',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos: auto-transferencia (self_transfer_not_allowed) o monto <= 0 (invalid_amount)',
  })
  @ApiResponse({
    status: 409,
    description: 'Fondos insuficientes en accounts-service (insufficient_funds)',
  })
  @ApiResponse({
    status: 422,
    description:
      'Crédito falló pero compensación exitosa: dinero devuelto al sender (ROLLED_BACK)',
  })
  @ApiResponse({
    status: 503,
    description: 'Accounts Service no disponible',
  })
  async transfer(@Body() dto: TransferDto) {
    return this.processorService.transfer(dto);
  }

  @Get('api/transactions/:user_id')
  @ApiOperation({
    summary: 'Historial de transacciones de un usuario',
    description:
      'Retorna todas las transacciones donde el usuario fue sender o receiver, ordenadas por fecha descendente.',
  })
  @ApiParam({ name: 'user_id', type: 'number', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de transacciones con campo "type": sent | received',
  })
  async getTransactionHistory(
    @Param('user_id', ParseIntPipe) userId: number,
  ) {
    return this.processorService.getTransactionHistory(userId);
  }
}
