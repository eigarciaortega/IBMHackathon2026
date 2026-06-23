import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles.constant';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from '../audit.service';
import { QueryAuditDto } from '../dto/query-audit.dto';

/**
 * AuditController — consulta de auditoría (solo ADMIN, RN-009 / doc 06).
 */
@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de auditoría (ADMIN)' })
  list(@Query() query: QueryAuditDto) {
    return this.auditService.list({
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un evento de auditoría (ADMIN)' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.getById(id);
  }
}
