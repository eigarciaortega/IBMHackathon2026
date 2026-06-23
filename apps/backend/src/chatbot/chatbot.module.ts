import { Module } from '@nestjs/common';
import { ChatbotController } from './controllers/chatbot.controller';
import { AssistantService } from './services/assistant.service';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotRepository } from './repositories/chatbot.repository';

/**
 * ChatbotModule — Bot FAQ + OfficeSpace Assistant (Audit y Prisma son globales).
 */
@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, AssistantService, ChatbotRepository],
  exports: [ChatbotService],
})
export class ChatbotModule {}
