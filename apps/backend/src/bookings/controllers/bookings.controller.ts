import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../../common/constants/roles.constant';
import { CheckOwnership } from '../../common/decorators/ownership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QueryBookingsDto } from '../dto/query-bookings.dto';
import { ValidateBookingDto } from '../dto/validate-booking.dto';
import { BookingsService } from '../services/bookings.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * BookingsController — núcleo del sistema. Todas las rutas requieren JWT.
 * Las rutas estáticas se declaran antes de ':id' para el enrutamiento correcto.
 */
@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear reserva (validaciones + anti-solapamiento)' })
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.bookingsService.create(dto, user, getIp(req));
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validar disponibilidad sin crear la reserva' })
  validate(@Body() dto: ValidateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.validate(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reservas (ADMIN todas; COLLABORATOR solo propias)' })
  findAll(@Query() query: QueryBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findAll(query, user);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Reservas del usuario autenticado' })
  myBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.myBookings(user);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Próximas reservas (CONFIRMED futuras) del usuario' })
  upcoming(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.upcoming(user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de reservas del usuario (estado efectivo)' })
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.history(user);
  }

  @Get('to-verify')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reservas por verificar (finalizadas y aún CONFIRMED) — ADMIN' })
  toVerify() {
    return this.bookingsService.listToVerify();
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership(BookingsService)
  @ApiOperation({ summary: 'Detalle de reserva (propietario o ADMIN)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findOne(id, user);
  }

  @Patch(':id/cancel')
  @UseGuards(OwnershipGuard)
  @CheckOwnership(BookingsService)
  @ApiOperation({ summary: 'Cancelar reserva (propietario o ADMIN)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.bookingsService.cancel(id, user, getIp(req));
  }

  @Patch(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Marcar NO_SHOW (solo ADMIN, tras finalizar)' })
  noShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.bookingsService.markNoShow(id, user, getIp(req));
  }

  @Patch(':id/attended')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Marcar asistencia verificada (solo ADMIN, tras finalizar)' })
  attended(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.bookingsService.markAttended(id, user, getIp(req));
  }
}
