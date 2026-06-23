import {
  Controller, Get, Post, Body, Delete, Param,
  ParseIntPipe, UseGuards, Request, Query,
  HttpCode, HttpStatus, Patch, ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Booking } from './entities/booking.entity';

@ApiTags('Reservas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear reserva',
    description:
      'Crea una nueva reserva. Valida: solapamiento de horarios (409), ' +
      'capacidad de asistentes (400), fecha en el pasado (400) y existencia del espacio (404).',
  })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente.', type: Booking })
  @ApiResponse({ status: 400, description: 'Error de validación (fechas inválidas o capacidad excedida).' })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario: el espacio ya está reservado en ese período.' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingsService.create(createBookingDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las reservas', description: 'Vista general para administradores.' })
  @ApiResponse({ status: 200, description: 'Lista de todas las reservas.', type: [Booking] })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  findAll(): Promise<Booking[]> {
    return this.bookingsService.findAll();
  }

  @Get('my')
  @ApiOperation({
    summary: 'Mis reservas',
    description: 'Retorna solo las reservas del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Reservas del usuario actual.', type: [Booking] })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  findMine(@Request() req: any): Promise<Booking[]> {
    return this.bookingsService.findByUser(req.user.id);
  }

  @Get('today')
  @ApiOperation({ summary: 'Reservas de hoy', description: 'Reservas del día actual. Útil para el Dashboard de Ocupación.' })
  @ApiResponse({ status: 200, description: 'Reservas del día de hoy.', type: [Booking] })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  findToday(): Promise<Booking[]> {
    return this.bookingsService.findTodaysBookings();
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Bot de sugerencias',
    description: 'Retorna hasta 3 sugerencias de horario óptimo basadas en el historial de uso de espacios.',
  })
  @ApiResponse({ status: 200, description: 'Lista de sugerencias de horario.' })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  getSuggestions(@Request() req: any) {
    return this.bookingsService.getSuggestions(req.user.id);
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check-in de reserva',
    description:
      'Confirma la presencia del usuario. Disponible 5 min antes y hasta 15 min después del inicio. ' +
      'Si el usuario no hace check-in en ese plazo, la sala se libera automáticamente.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Check-in realizado.', type: Booking })
  @ApiResponse({ status: 400, description: 'Fuera de ventana de check-in o reserva no elegible.' })
  @ApiResponse({ status: 403, description: 'No puedes hacer check-in en reservas de otros usuarios.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  checkIn(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingsService.checkIn(id, req.user.id, req.user.role);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Verificar disponibilidad de un espacio',
    description: 'Verifica si un espacio específico está disponible en un rango de tiempo.',
  })
  @ApiQuery({ name: 'spaceId', type: Number, description: 'ID del espacio' })
  @ApiQuery({ name: 'start', type: String, description: 'Inicio ISO 8601', example: '2026-06-24T09:00:00Z' })
  @ApiQuery({ name: 'end', type: String, description: 'Fin ISO 8601', example: '2026-06-24T10:00:00Z' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de disponibilidad.',
    schema: {
      example: { available: false, conflict: { id: 1, start_time: '...', end_time: '...' } },
    },
  })
  checkAvailability(
    @Query('spaceId', ParseIntPipe) spaceId: number,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingsService.checkAvailability(spaceId, new Date(start), new Date(end));
  }

  @Get('spaces/available')
  @ApiOperation({
    summary: 'Buscar espacios disponibles',
    description:
      'Retorna todos los espacios con su disponibilidad para un rango horario dado. ' +
      'Soporta filtros por tipo y capacidad mínima.',
  })
  @ApiQuery({ name: 'start', type: String, required: true, example: '2026-06-24T09:00:00Z' })
  @ApiQuery({ name: 'end', type: String, required: true, example: '2026-06-24T10:00:00Z' })
  @ApiQuery({ name: 'type', type: String, required: false, enum: ['SALA', 'DESK'] })
  @ApiQuery({ name: 'minCapacity', type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista de espacios con campo "available" (boolean).',
  })
  findAvailableSpaces(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('type') type?: string,
    @Query('minCapacity') minCapacity?: string,
  ) {
    return this.bookingsService.findAvailableSpaces(
      new Date(start),
      new Date(end),
      type,
      minCapacity ? parseInt(minCapacity) : undefined,
    );
  }

  @Get('affected')
  @ApiOperation({ summary: 'Reservas futuras afectadas por mantenimiento de un espacio' })
  @ApiQuery({ name: 'spaceId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Lista de reservas afectadas.', type: [Booking] })
  getAffected(@Query('spaceId', ParseIntPipe) spaceId: number): Promise<Booking[]> {
    return this.bookingsService.getAffectedBookings(spaceId);
  }

  @Get(':id/alternatives')
  @ApiOperation({ summary: 'Alternativas de espacio para reubicar una reserva' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Espacios disponibles para la misma franja horaria.' })
  getAlternatives(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.getAlternativesForBooking(id);
  }

  @Patch(':id/relocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reasignar reserva a otro espacio [ADMIN]' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reserva reasignada.', type: Booking })
  @ApiResponse({ status: 400, description: 'Capacidad insuficiente.' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden reasignar reservas.' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario en el espacio destino.' })
  async relocate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { spaceId: number },
    @Request() req: any,
  ): Promise<Booking> {
    if (req.user.role !== 'ADMINISTRADOR') {
      throw new ForbiddenException('Solo los administradores pueden reasignar reservas.');
    }
    return this.bookingsService.relocate(id, body.spaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reserva por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reserva encontrada.', type: Booking })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Booking> {
    return this.bookingsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar reserva',
    description:
      'Cancela una reserva. El colaborador solo puede cancelar sus propias reservas. ' +
      'El administrador puede cancelar cualquier reserva.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente.' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar una reserva pasada.' })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 403, description: 'No puedes cancelar reservas de otros usuarios.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.bookingsService.cancel(id, req.user.id, req.user.role);
    return { message: 'Reserva cancelada exitosamente.' };
  }
}
