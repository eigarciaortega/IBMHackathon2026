import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { NotificationsService } from '../services/notifications.service';

/**
 * NotificationsController — solo notificaciones propias del usuario autenticado.
 * No expone notificaciones de otros usuarios (ni a ADMIN) por este endpoint.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones propias' })
  list(@CurrentUser('id') userId: string, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.list(userId, {
      isRead: query.isRead,
      page: query.page,
      limit: query.limit,
    });
  }

  // Ruta estática antes de ':id/read' no aplica (prefijos distintos), pero
  // declaramos read-all antes por claridad.
  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones propias como leídas' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación propia como leída' })
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
