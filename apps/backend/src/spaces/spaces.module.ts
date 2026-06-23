import { Module } from '@nestjs/common';
import { SpacesController } from './controllers/spaces.controller';
import { SpacesService } from './services/spaces.service';
import { SpacesRepository } from './repositories/spaces.repository';

/**
 * SpacesModule — gestión de espacios (Audit es global; Prisma es global).
 */
@Module({
  controllers: [SpacesController],
  providers: [SpacesService, SpacesRepository],
  exports: [SpacesService],
})
export class SpacesModule {}
