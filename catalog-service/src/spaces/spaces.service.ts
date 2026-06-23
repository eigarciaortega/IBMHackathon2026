import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from './entities/space.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
  ) {}

  async create(createSpaceDto: CreateSpaceDto): Promise<Space> {
    const space = this.spacesRepository.create(createSpaceDto);
    return this.spacesRepository.save(space);
  }

  async findAll(type?: string, minCapacity?: number): Promise<Space[]> {
    await this.releaseExpiredMaintenance();
    const qb = this.spacesRepository.createQueryBuilder('space');
    if (type) qb.andWhere('space.type = :type', { type });
    if (minCapacity) qb.andWhere('space.capacity >= :minCapacity', { minCapacity });
    return qb.orderBy('space.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Space> {
    const space = await this.spacesRepository.findOne({ where: { id } });
    if (!space) throw new NotFoundException(`Espacio con ID ${id} no encontrado.`);
    return space;
  }

  async update(id: number, updateSpaceDto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findOne(id);
    Object.assign(space, updateSpaceDto);
    return this.spacesRepository.save(space);
  }

  async remove(id: number): Promise<void> {
    const space = await this.findOne(id);
    await this.spacesRepository.remove(space);
  }

  async setMaintenance(id: number, until: string, reason: string): Promise<Space> {
    const space = await this.findOne(id);
    const untilDate = new Date(until);
    if (untilDate <= new Date()) {
      throw new BadRequestException('La fecha de fin de mantenimiento debe ser en el futuro.');
    }
    space.is_under_maintenance = true;
    space.maintenance_until = untilDate;
    space.maintenance_reason = reason;
    return this.spacesRepository.save(space);
  }

  async clearMaintenance(id: number): Promise<Space> {
    const space = await this.findOne(id);
    space.is_under_maintenance = false;
    space.maintenance_until = null;
    space.maintenance_reason = null;
    return this.spacesRepository.save(space);
  }

  // Libera automáticamente salas cuyo mantenimiento ya venció
  private async releaseExpiredMaintenance(): Promise<void> {
    await this.spacesRepository
      .createQueryBuilder()
      .update(Space)
      .set({ is_under_maintenance: false, maintenance_until: null, maintenance_reason: null })
      .where('is_under_maintenance = true AND maintenance_until <= :now', { now: new Date() })
      .execute();
  }
}
