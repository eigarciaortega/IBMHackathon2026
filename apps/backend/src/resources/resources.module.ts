import { Module } from '@nestjs/common';
import { ResourcesController } from './controllers/resources.controller';
import { ResourcesService } from './services/resources.service';
import { ResourcesRepository } from './repositories/resources.repository';

/**
 * ResourcesModule — catálogo de recursos (Audit y Prisma son globales).
 */
@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}
