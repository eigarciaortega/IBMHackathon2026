import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { RechargeDto } from './dto/recharge.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';

@ApiTags('Accounts')
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio activo' })
  health() {
    return {
      status: 'ok',
      service: 'accounts-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Consultar saldo y datos de un usuario' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Datos del usuario retornados exitosamente' })
  @ApiResponse({ status: 400, description: 'ID inválido (no numérico)' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getAccount(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.getAccount(id);
  }

  @Post('api/recharge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recargar saldo de un usuario (simulado)' })
  @ApiResponse({ status: 200, description: 'Saldo recargado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o monto incorrecto' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async recharge(@Body() dto: RechargeDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException({
        error: 'invalid_amount',
        message: 'El monto debe ser mayor a 0',
      });
    }
    return this.accountsService.recharge(dto);
  }

  @Post('accounts/update-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar balance de usuario (endpoint interno)',
    description:
      'Usado exclusivamente por el Processor Service. Soporta operaciones de débito y crédito con bloqueo pesimista para prevenir race conditions.',
  })
  @ApiResponse({ status: 200, description: 'Balance actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'Fondos insuficientes (solo en débito)' })
  async updateBalance(@Body() dto: UpdateBalanceDto) {
    return this.accountsService.updateBalance(dto);
  }
}
