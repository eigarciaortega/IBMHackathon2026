import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AdminDashboardResponseDto,
  AnalyticsResponseDto,
  CollaboratorDashboardResponseDto,
} from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';

/**
 * DashboardController — métricas calculadas on-demand (sin datos simulados).
 * admin/analytics: solo ADMIN. collaborator: cualquier autenticado (ADMIN
 * incluido, útil para pruebas).
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard administrativo (ADMIN)' })
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  getAdmin() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Analítica administrativa (ADMIN)' })
  @ApiOkResponse({ type: AnalyticsResponseDto })
  getAnalytics() {
    return this.dashboardService.getAnalytics();
  }

  @Get('collaborator')
  @ApiOperation({ summary: 'Dashboard del colaborador (autenticado)' })
  @ApiOkResponse({ type: CollaboratorDashboardResponseDto })
  getCollaborator(@CurrentUser('id') userId: string) {
    return this.dashboardService.getCollaboratorDashboard(userId);
  }
}
