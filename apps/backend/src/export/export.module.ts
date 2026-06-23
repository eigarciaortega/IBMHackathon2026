import { Module } from '@nestjs/common';
import { ExportController } from './controllers/export.controller';
import { ExportService } from './services/export.service';
import { ExportRepository } from './repositories/export.repository';

/**
 * ExportModule — exportaciones CSV (solo ADMIN). Prisma es global.
 */
@Module({
  controllers: [ExportController],
  providers: [ExportService, ExportRepository],
  exports: [ExportService],
})
export class ExportModule {}
