import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  ParseIntPipe, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space, SpaceType } from './entities/space.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Espacios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear espacio [ADMIN]', description: 'Requiere rol ADMINISTRADOR.' })
  @ApiResponse({ status: 201, description: 'Espacio creado exitosamente.', type: Space })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR.' })
  create(@Body() createSpaceDto: CreateSpaceDto): Promise<Space> {
    return this.spacesService.create(createSpaceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar espacios',
    description: 'Retorna todos los espacios. Soporta filtros por tipo y capacidad mínima.',
  })
  @ApiQuery({ name: 'type', required: false, enum: SpaceType, description: 'Filtrar por tipo' })
  @ApiQuery({ name: 'minCapacity', required: false, type: Number, description: 'Capacidad mínima' })
  @ApiResponse({ status: 200, description: 'Lista de espacios.', type: [Space] })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  findAll(
    @Query('type') type?: string,
    @Query('minCapacity') minCapacity?: string,
  ): Promise<Space[]> {
    return this.spacesService.findAll(type, minCapacity ? parseInt(minCapacity) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener espacio por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del espacio' })
  @ApiResponse({ status: 200, description: 'Espacio encontrado.', type: Space })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Space> {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar espacio [ADMIN]', description: 'Requiere rol ADMINISTRADOR.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Espacio actualizado.', type: Space })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR.' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSpaceDto: UpdateSpaceDto,
  ): Promise<Space> {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Patch(':id/maintenance')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Poner sala en mantenimiento [ADMIN]' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sala en mantenimiento.', type: Space })
  @ApiResponse({ status: 400, description: 'Fecha de fin inválida.' })
  setMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { until: string; reason: string },
  ): Promise<Space> {
    return this.spacesService.setMaintenance(id, body.until, body.reason);
  }

  @Delete(':id/maintenance')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivar sala (quitar mantenimiento) [ADMIN]' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sala reactivada.', type: Space })
  clearMaintenance(@Param('id', ParseIntPipe) id: number): Promise<Space> {
    return this.spacesService.clearMaintenance(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar espacio [ADMIN]', description: 'Requiere rol ADMINISTRADOR.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Espacio eliminado.' })
  @ApiResponse({ status: 401, description: 'Token JWT requerido.' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR.' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.spacesService.remove(id);
  }
}
