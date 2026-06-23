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
import { CreateUserDto } from '../dto/create-user.dto';
import { QueryUsersDto } from '../dto/query-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UsersService } from '../services/users.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * UsersController — gestión de usuarios (solo ADMIN, RN-009).
 */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear usuario (genera contraseña temporal)' })
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return this.usersService.create(dto, actorId, getIp(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (filtros validados)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar usuario por id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, actorId, getIp(req));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de usuario (ACTIVE/INACTIVE/BLOCKED)' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.usersService.changeStatus(id, dto.status, actorId, getIp(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrado lógico de usuario (status = INACTIVE)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.usersService.softDelete(id, actorId, getIp(req));
  }
}
