import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../../common/constants/roles.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateSpaceDto } from '../dto/create-space.dto';
import { QuerySpacesDto } from '../dto/query-spaces.dto';
import { UpdateSpaceDto } from '../dto/update-space.dto';
import { UpdateSpaceStatusDto } from '../dto/update-space-status.dto';
import { SpacesService } from '../services/spaces.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * SpacesController — consulta para usuarios autenticados; mutaciones solo ADMIN.
 */
@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar espacios (los no-ADMIN no ven INACTIVE)' })
  findAll(@Query() query: QuerySpacesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.spacesService.findAll(query, user.role === Role.ADMIN);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar espacio por id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spacesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear espacio (ADMIN)' })
  create(@Body() dto: CreateSpaceDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return this.spacesService.create(dto, actorId, getIp(req));
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar espacio (ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.spacesService.update(id, dto, actorId, getIp(req));
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado (bloquea MAINTENANCE/INACTIVE con reservas futuras)' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpaceStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.spacesService.changeStatus(id, dto.status, actorId, getIp(req));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Borrado lógico de espacio (status = INACTIVE)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.spacesService.softDelete(id, actorId, getIp(req));
  }
}
