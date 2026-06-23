import { Module } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { BookingsService } from './services/bookings.service';
import { BookingsRepository } from './repositories/bookings.repository';

/**
 * BookingsModule — núcleo del negocio. Depende de Users y Spaces (a nivel de
 * datos vía Prisma) y de Audit (global). El OwnershipGuard resuelve la
 * propiedad usando BookingsService (implementa OwnershipResolver).
 */
@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsService],
})
export class BookingsModule {}
