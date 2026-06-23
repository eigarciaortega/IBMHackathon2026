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
import { AskDto } from '../dto/ask.dto';
import { CreateFaqDto } from '../dto/create-faq.dto';
import { QueryFaqDto } from '../dto/query-faq.dto';
import { UpdateFaqDto } from '../dto/update-faq.dto';
import { ChatbotService } from '../services/chatbot.service';

function getIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * ChatbotController — Bot FAQ. Lectura/consulta: ADMIN y COLLABORATOR.
 * Gestión de FAQs: solo ADMIN. Todos los endpoints requieren JWT.
 */
@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('faq')
  @ApiOperation({ summary: 'Listar FAQs activas (ADMIN/COLLABORATOR)' })
  listFaq(@Query() query: QueryFaqDto) {
    return this.chatbotService.listFaq(query.category, query.page, query.limit);
  }

  @Post('ask')
  @ApiOperation({ summary: 'Consultar el Bot FAQ (ADMIN/COLLABORATOR, sin IA)' })
  ask(@Body() dto: AskDto) {
    return this.chatbotService.ask(dto.question);
  }

  @Post('faq')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear FAQ (ADMIN)' })
  create(@Body() dto: CreateFaqDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return this.chatbotService.createFaq(dto, actorId, getIp(req));
  }

  @Put('faq/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar FAQ (ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return this.chatbotService.updateFaq(id, dto, actorId, getIp(req));
  }

  @Delete('faq/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Borrado lógico de FAQ (ADMIN)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return this.chatbotService.deleteFaq(id, actorId, getIp(req));
  }
}
