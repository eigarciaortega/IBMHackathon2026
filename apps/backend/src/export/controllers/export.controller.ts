import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '../../common/constants/roles.constant';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExportQueryDto } from '../dto/export-query.dto';
import { ExportResult, ExportService } from '../services/export.service';

/**
 * ExportController — exportaciones (solo ADMIN). CSV obligatorio (H-08).
 *
 * Nota de auditoría: el catálogo oficial de 17 eventos (C-04) NO incluye un
 * evento EXPORT, por lo que la exportación NO se audita en el MVP (documentado
 * como fuera de alcance / mejora futura).
 */
@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiQuery({ name: 'format', enum: ['csv', 'xlsx'], required: false })
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  private send(res: Response, result: ExportResult): void {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Exportar reservas (CSV, ADMIN)' })
  async bookings(@Query() query: ExportQueryDto, @Res() res: Response) {
    this.send(res, await this.exportService.exportBookings(query.format ?? 'csv'));
  }

  @Get('spaces')
  @ApiOperation({ summary: 'Exportar espacios (CSV, ADMIN)' })
  async spaces(@Query() query: ExportQueryDto, @Res() res: Response) {
    this.send(res, await this.exportService.exportSpaces(query.format ?? 'csv'));
  }

  @Get('users')
  @ApiOperation({ summary: 'Exportar usuarios (CSV, ADMIN; sin datos sensibles)' })
  async users(@Query() query: ExportQueryDto, @Res() res: Response) {
    this.send(res, await this.exportService.exportUsers(query.format ?? 'csv'));
  }

  @Get('audit')
  @ApiOperation({ summary: 'Exportar auditoría (CSV, ADMIN)' })
  async audit(@Query() query: ExportQueryDto, @Res() res: Response) {
    this.send(res, await this.exportService.exportAudit(query.format ?? 'csv'));
  }
}
