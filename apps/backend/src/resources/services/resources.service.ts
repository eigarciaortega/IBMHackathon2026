import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResourceStatus } from '@prisma/client';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { QueryResourcesDto } from '../dto/query-resources.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourcesRepository } from '../repositories/resources.repository';

/**
 * ResourcesService — catálogo de recursos. Mutaciones solo ADMIN.
 * Borrado lógico (decisión C-03): status = INACTIVE.
 */
@Injectable()
export class ResourcesService {
  constructor(
    private readonly resourcesRepository: ResourcesRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateResourceDto, actorId: string, ipAddress?: string) {
    try {
      const resource = await this.resourcesRepository.create({
        name: dto.name,
        description: dto.description,
        status: ResourceStatus.ACTIVE,
      });
      await this.auditService.record({
        userId: actorId,
        action: AuditAction.CREATE_RESOURCE,
        entityType: AuditEntity.RESOURCE,
        entityId: resource.id,
        success: true,
        newValues: { name: resource.name },
        ipAddress,
      });
      return resource;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un recurso con ese nombre.');
      }
      throw error;
    }
  }

  async findAll(query: QueryResourcesDto, isAdmin: boolean) {
    return this.resourcesRepository.findMany({ ...query, excludeInactive: !isAdmin });
  }

  async findOne(id: string) {
    const resource = await this.resourcesRepository.findById(id);
    if (!resource) {
      throw new NotFoundException('Recurso no encontrado.');
    }
    return resource;
  }

  async update(id: string, dto: UpdateResourceDto, actorId: string, ipAddress?: string) {
    await this.findOne(id);
    try {
      const updated = await this.resourcesRepository.update(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      });
      await this.auditService.record({
        userId: actorId,
        action: AuditAction.UPDATE_RESOURCE,
        entityType: AuditEntity.RESOURCE,
        entityId: id,
        success: true,
        newValues: { ...dto },
        ipAddress,
      });
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un recurso con ese nombre.');
      }
      throw error;
    }
  }

  /** Borrado lógico (C-03): status = INACTIVE. Audita DELETE_RESOURCE. */
  async softDelete(id: string, actorId: string, ipAddress?: string) {
    await this.findOne(id);
    const updated = await this.resourcesRepository.update(id, { status: ResourceStatus.INACTIVE });
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.DELETE_RESOURCE,
      entityType: AuditEntity.RESOURCE,
      entityId: id,
      success: true,
      newValues: { status: ResourceStatus.INACTIVE },
      ipAddress,
    });
    return updated;
  }
}
