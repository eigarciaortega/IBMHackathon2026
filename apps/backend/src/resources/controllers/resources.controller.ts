import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateResourceDto } from '../dto/create-resource.dto';
import { QueryResourcesDto } from '../dto/query-resources.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourcesService } from '../services/resources.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * ResourcesController — catálogo para usuarios autenticados; mutaciones ADMIN.
 */
@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar catálogo de recursos (no-ADMIN no ve INACTIVE)' })
  findAll(@Query() query: QueryResourcesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.findAll(query, user.role === Role.ADMIN);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar recurso por id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.resourcesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear recurso (ADMIN)' })
  create(@Body() dto: CreateResourceDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return this.resourcesService.create(dto, actorId, getIp(req));
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar recurso (ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.resourcesService.update(id, dto, actorId, getIp(req));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Borrado lógico de recurso (status = INACTIVE)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.resourcesService.softDelete(id, actorId, getIp(req));
  }
}
