import { Module } from '@nestjs/common';
import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotRepository } from './repositories/chatbot.repository';

/**
 * ChatbotModule — Bot FAQ (Audit y Prisma son globales).
 */
@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotRepository],
  exports: [ChatbotService],
})
export class ChatbotModule {}
