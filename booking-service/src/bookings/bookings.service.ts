import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Space } from '../spaces/entities/space.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
  ) {}

  // Marca como NO_SHOW reservas CONFIRMED que comenzaron hace más de 15 min sin check-in
  async releaseNoShows(): Promise<void> {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    await this.bookingsRepository.update(
      { status: 'CONFIRMED', start_time: LessThan(cutoff) },
      { status: 'NO_SHOW' },
    );
  }

  async create(dto: CreateBookingDto, userId: number): Promise<Booking> {
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    const now = new Date();

    if (start < now) {
      throw new BadRequestException('La hora de inicio no puede ser en el pasado.');
    }

    if (end <= start) {
      throw new BadRequestException('La hora de fin debe ser estrictamente mayor a la hora de inicio.');
    }

    const space = await this.spacesRepository.findOne({ where: { id: dto.space_id } });
    if (!space) {
      throw new NotFoundException(`Espacio con ID ${dto.space_id} no encontrado.`);
    }
    if (dto.attendees > space.capacity) {
      throw new BadRequestException(
        `El número de asistentes (${dto.attendees}) supera la capacidad máxima del espacio "${space.name}" (${space.capacity}).`,
      );
    }
    // Bloquear reserva si el espacio está en mantenimiento durante el horario solicitado
    if (
      space.is_under_maintenance &&
      space.maintenance_until != null &&
      new Date(space.maintenance_until) > start
    ) {
      throw new BadRequestException(
        `"${space.name}" está en mantenimiento hasta el ${new Date(space.maintenance_until).toLocaleString('es-MX')}.`,
      );
    }

    // NO_SHOW bookings ya no bloquean el espacio
    const overlap = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.space_id = :spaceId', { spaceId: dto.space_id })
      .andWhere('booking.start_time < :endTime', { endTime: end })
      .andWhere('booking.end_time > :startTime', { startTime: start })
      .andWhere("booking.status != 'NO_SHOW'")
      .andWhere("booking.status != 'CANCELLED'")
      .getOne();

    if (overlap) {
      throw new ConflictException(
        `El espacio ya tiene una reserva que se solapa: de ${overlap.start_time.toISOString()} a ${overlap.end_time.toISOString()}.`,
      );
    }

    const booking = this.bookingsRepository.create({
      space_id: dto.space_id,
      user_id: userId,
      start_time: start,
      end_time: end,
      attendees: dto.attendees,
      status: 'CONFIRMED',
    });

    return this.bookingsRepository.save(booking);
  }

  async checkIn(id: number, userId: number, userRole: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.user_id !== userId && userRole !== 'ADMINISTRADOR') {
      throw new ForbiddenException('Solo puedes hacer check-in en tus propias reservas.');
    }

    if (booking.status === 'CHECKED_IN') {
      throw new BadRequestException('Ya realizaste el check-in para esta reserva.');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Esta reserva no está disponible para check-in.');
    }

    const now = new Date();
    const start = new Date(booking.start_time);
    const windowStart = new Date(start.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(start.getTime() + 15 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      throw new BadRequestException(
        'El check-in solo está disponible desde 5 minutos antes hasta 15 minutos después del inicio de la reserva.',
      );
    }

    booking.status = 'CHECKED_IN';
    booking.checked_in_at = now;
    return this.bookingsRepository.save(booking);
  }

  async getSuggestions(userId: number): Promise<any[]> {
    await this.releaseNoShows();

    const spaces = await this.spacesRepository.find();
    if (spaces.length === 0) return [];

    const from = new Date();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const usageRows = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('booking.space_id', 'space_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('booking.start_time >= :from', { from })
      .andWhere('booking.start_time <= :to', { to })
      .andWhere("booking.status != 'NO_SHOW'")
      .groupBy('booking.space_id')
      .getRawMany();

    const usageMap = new Map<number, number>();
    usageRows.forEach((r) => usageMap.set(Number(r.space_id), Number(r.cnt)));

    const scored = spaces
      .map((s) => ({ space: s, usage: usageMap.get(s.id) ?? 0 }))
      .sort((a, b) => a.usage - b.usage);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const slots = [
      { startTime: '08:00', endTime: '09:00', label: 'Mañana temprano' },
      { startTime: '11:00', endTime: '12:00', label: 'Media mañana' },
      { startTime: '14:00', endTime: '15:00', label: 'Tarde' },
    ];

    const suggestions: any[] = [];

    for (const slot of slots) {
      const startISO = new Date(`${dateStr}T${slot.startTime}:00`);
      const endISO = new Date(`${dateStr}T${slot.endTime}:00`);

      for (const { space } of scored) {
        const conflict = await this.bookingsRepository
          .createQueryBuilder('booking')
          .where('booking.space_id = :spaceId', { spaceId: space.id })
          .andWhere('booking.start_time < :end', { end: endISO })
          .andWhere('booking.end_time > :start', { start: startISO })
          .andWhere("booking.status != 'NO_SHOW'")
          .getOne();

        if (!conflict) {
          suggestions.push({
            spaceId: space.id,
            spaceName: space.name,
            spaceType: space.type,
            date: dateStr,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label,
            reason: `${space.name} es uno de los espacios con menor demanda esta semana`,
          });
          break;
        }
      }

      if (suggestions.length === 3) break;
    }

    return suggestions;
  }

  async findAll(): Promise<Booking[]> {
    await this.releaseNoShows();
    return this.bookingsRepository.find({
      relations: ['space'],
      order: { start_time: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Booking[]> {
    await this.releaseNoShows();
    return this.bookingsRepository.find({
      where: { user_id: userId },
      relations: ['space'],
      order: { start_time: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['space'],
    });
    if (!booking) throw new NotFoundException(`Reserva con ID ${id} no encontrada.`);
    return booking;
  }

  async cancel(id: number, userId: number, userRole: string): Promise<void> {
    const booking = await this.findOne(id);

    if (booking.user_id !== userId && userRole !== 'ADMINISTRADOR') {
      throw new ForbiddenException('Solo puedes cancelar tus propias reservas.');
    }

    if (booking.start_time <= new Date()) {
      throw new BadRequestException('No puedes cancelar una reserva que ya comenzó o está en el pasado.');
    }

    await this.bookingsRepository.remove(booking);
  }

  async checkAvailability(
    spaceId: number,
    start: Date,
    end: Date,
  ): Promise<{ available: boolean; conflict?: Partial<Booking> }> {
    const overlap = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.space_id = :spaceId', { spaceId })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .andWhere("booking.status != 'NO_SHOW'")
      .getOne();

    if (overlap) {
      return { available: false, conflict: { id: overlap.id, start_time: overlap.start_time, end_time: overlap.end_time } };
    }
    return { available: true };
  }

  async findAvailableSpaces(
    start: Date,
    end: Date,
    type?: string,
    minCapacity?: number,
  ): Promise<(Space & { available: boolean })[]> {
    await this.releaseNoShows();
    await this.releaseExpiredMaintenance();

    const spaceQb = this.spacesRepository.createQueryBuilder('space');
    if (type) spaceQb.andWhere('space.type = :type', { type });
    if (minCapacity) spaceQb.andWhere('space.capacity >= :minCapacity', { minCapacity });
    const spaces = await spaceQb.getMany();

    const bookedIds = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('DISTINCT booking.space_id', 'space_id')
      .where('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .andWhere("booking.status != 'NO_SHOW'")
      .getRawMany();

    const bookedSet = new Set(bookedIds.map((b) => b.space_id));

    return spaces.map((space) => {
      // El mantenimiento bloquea solo si sigue activo durante el horario solicitado
      const underMaintenance =
        space.is_under_maintenance &&
        space.maintenance_until != null &&
        new Date(space.maintenance_until) > start;
      return { ...space, available: !bookedSet.has(space.id) && !underMaintenance };
    });
  }

  // Reservas futuras confirmadas de un espacio (para mostrar afectadas por mantenimiento)
  async getAffectedBookings(spaceId: number): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { space_id: spaceId, start_time: MoreThan(new Date()), status: 'CONFIRMED' },
      relations: ['space'],
      order: { start_time: 'ASC' },
    });
  }

  // Alternativas disponibles para reubicar una reserva
  async getAlternativesForBooking(bookingId: number): Promise<(Space & { available: boolean })[]> {
    const booking = await this.findOne(bookingId);
    // findAvailableSpaces ya aplica el filtro de mantenimiento comparando contra booking.start_time
    const candidates = await this.findAvailableSpaces(booking.start_time, booking.end_time);

    return candidates.filter((s) => {
      return s.id !== booking.space_id && s.capacity >= booking.attendees && s.available;
    });
  }

  // Reasigna una reserva a otro espacio
  async relocate(bookingId: number, newSpaceId: number): Promise<Booking> {
    const booking = await this.findOne(bookingId);

    const newSpace = await this.spacesRepository.findOne({ where: { id: newSpaceId } });
    if (!newSpace) throw new NotFoundException(`Espacio destino ${newSpaceId} no encontrado.`);
    if (newSpace.capacity < booking.attendees) {
      throw new BadRequestException(
        `"${newSpace.name}" no tiene capacidad suficiente (${newSpace.capacity}) para ${booking.attendees} asistentes.`,
      );
    }

    const conflict = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.space_id = :spaceId', { spaceId: newSpaceId })
      .andWhere('booking.id != :bookingId', { bookingId })
      .andWhere('booking.start_time < :end', { end: booking.end_time })
      .andWhere('booking.end_time > :start', { start: booking.start_time })
      .andWhere("booking.status != 'NO_SHOW'")
      .getOne();

    if (conflict) {
      throw new ConflictException(`"${newSpace.name}" ya tiene una reserva en ese horario.`);
    }

    booking.space_id = newSpaceId;
    return this.bookingsRepository.save(booking);
  }

  async findTodaysBookings(): Promise<Booking[]> {
    await this.releaseNoShows();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.space', 'space')
      .where('booking.start_time >= :startOfDay', { startOfDay })
      .andWhere('booking.start_time <= :endOfDay', { endOfDay })
      .orderBy('booking.start_time', 'ASC')
      .getMany();
  }

  // Limpia el flag de mantenimiento de espacios cuyo período ya venció
  private async releaseExpiredMaintenance(): Promise<void> {
    await this.spacesRepository
      .createQueryBuilder()
      .update(Space)
      .set({ is_under_maintenance: false, maintenance_until: null, maintenance_reason: null })
      .where('is_under_maintenance = true AND maintenance_until <= :now', { now: new Date() })
      .execute();
  }
}
