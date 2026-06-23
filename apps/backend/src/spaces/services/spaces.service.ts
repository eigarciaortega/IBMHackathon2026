import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SpaceStatus } from '@prisma/client';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { CreateSpaceDto } from '../dto/create-space.dto';
import { QuerySpacesDto } from '../dto/query-spaces.dto';
import { UpdateSpaceDto } from '../dto/update-space.dto';
import { FindSpacesQuery, SpacesRepository } from '../repositories/spaces.repository';

/**
 * SpacesService — gestión de espacios. Mutaciones solo ADMIN (RN-018/RN-019).
 */
@Injectable()
export class SpacesService {
  constructor(
    private readonly spacesRepository: SpacesRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Notificaciones de eventos de espacio.
   * SpacesService (catalog-service) NO depende de NotificationsService:
   * catalog-service no importa NotificationsModule. Quedan como no-op no
   * bloqueante para evitar dependencias cruzadas entre microservicios.
   */
  private async notifySpaceMaintenance(_actorId: string, _spaceName: string): Promise<void> {
    // no-op
  }
  private async notifySpaceDeactivated(_actorId: string, _spaceName: string): Promise<void> {
    // no-op
  }

  /**
   * Valida que todos los resourceIds existan y estén ACTIVE (ajuste Fase 5).
   * Lanza 400 Bad Request si alguno no existe o está INACTIVE.
   */
  private async assertResourcesValid(resourceIds?: string[]): Promise<void> {
    if (!resourceIds || resourceIds.length === 0) {
      return;
    }
    const validIds = await this.spacesRepository.findActiveResourceIds(resourceIds);
    if (validIds.length !== resourceIds.length) {
      const invalid = resourceIds.filter((id) => !validIds.includes(id));
      throw new BadRequestException(
        `Recursos inválidos o inactivos: ${invalid.join(', ')}`,
      );
    }
  }

  async create(dto: CreateSpaceDto, actorId: string, ipAddress?: string) {
    const { resourceIds, ...rest } = dto;
    await this.assertResourcesValid(resourceIds);
    const space = await this.spacesRepository.create(
      {
        name: rest.name,
        spaceType: rest.spaceType,
        capacity: rest.capacity,
        floor: rest.floor,
        zone: rest.zone,
        description: rest.description,
        status: rest.status ?? SpaceStatus.AVAILABLE,
        creator: { connect: { id: actorId } },
      },
      resourceIds,
    );

    await this.auditService.record({
      userId: actorId,
      action: AuditAction.CREATE_SPACE,
      entityType: AuditEntity.SPACE,
      entityId: space.id,
      success: true,
      newValues: { name: space.name, capacity: space.capacity, status: space.status },
      ipAddress,
    });
    return space;
  }

  async findAll(query: QuerySpacesDto, isAdmin: boolean) {
    const repoQuery: FindSpacesQuery = { ...query, excludeInactive: !isAdmin };
    return this.spacesRepository.findMany(repoQuery);
  }

  async findOne(id: string) {
    const space = await this.spacesRepository.findById(id);
    if (!space) {
      throw new NotFoundException('Espacio no encontrado.');
    }
    return space;
  }

  async update(id: string, dto: UpdateSpaceDto, actorId: string, ipAddress?: string) {
    await this.findOne(id);
    const { resourceIds, ...rest } = dto;
    await this.assertResourcesValid(resourceIds);
    const data: Prisma.SpaceUpdateInput = {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.spaceType !== undefined ? { spaceType: rest.spaceType } : {}),
      ...(rest.capacity !== undefined ? { capacity: rest.capacity } : {}),
      ...(rest.floor !== undefined ? { floor: rest.floor } : {}),
      ...(rest.zone !== undefined ? { zone: rest.zone } : {}),
      ...(rest.description !== undefined ? { description: rest.description } : {}),
    };

    const updated = await this.spacesRepository.update(id, data, resourceIds);
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.UPDATE_SPACE,
      entityType: AuditEntity.SPACE,
      entityId: id,
      success: true,
      newValues: { ...dto },
      ipAddress,
    });
    return updated;
  }

  /**
   * Cambia el estado. Decisión H-05: no se permite pasar a MAINTENANCE/INACTIVE
   * si el espacio tiene reservas futuras activas.
   */
  async changeStatus(id: string, status: SpaceStatus, actorId: string, ipAddress?: string) {
    const space = await this.findOne(id);
    await this.assertNoFutureBookingsIfDeactivating(id, status);

    const updated = await this.spacesRepository.update(id, { status });
    const action =
      status === SpaceStatus.INACTIVE ? AuditAction.DISABLE_SPACE : AuditAction.UPDATE_SPACE;
    await this.auditService.record({
      userId: actorId,
      action,
      entityType: AuditEntity.SPACE,
      entityId: id,
      success: true,
      newValues: { status },
      ipAddress,
    });

    // Notificación interna (H-07). Recipiente: el administrador que ejecuta la
    // acción (confirmación). La difusión a usuarios afectados queda como mejora
    // futura (en el MVP, H-05 impide desactivar con reservas futuras).
    if (status === SpaceStatus.MAINTENANCE) {
      await this.notifySpaceMaintenance(actorId, space.name);
    } else if (status === SpaceStatus.INACTIVE) {
      await this.notifySpaceDeactivated(actorId, space.name);
    }
    return updated;
  }

  /** Borrado lógico (RN-020): status = INACTIVE, con la restricción H-05. */
  async softDelete(id: string, actorId: string, ipAddress?: string) {
    const space = await this.findOne(id);
    await this.assertNoFutureBookingsIfDeactivating(id, SpaceStatus.INACTIVE);

    const updated = await this.spacesRepository.update(id, { status: SpaceStatus.INACTIVE });
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.DISABLE_SPACE,
      entityType: AuditEntity.SPACE,
      entityId: id,
      success: true,
      newValues: { status: SpaceStatus.INACTIVE },
      ipAddress,
    });

    await this.notifySpaceDeactivated(actorId, space.name);
    return updated;
  }

  private async assertNoFutureBookingsIfDeactivating(id: string, status: SpaceStatus) {
    if (status === SpaceStatus.MAINTENANCE || status === SpaceStatus.INACTIVE) {
      const futureBookings = await this.spacesRepository.countActiveFutureBookings(id);
      if (futureBookings > 0) {
        throw new ConflictException(
          'No se puede cambiar el estado: el espacio tiene reservas futuras activas. Cancélalas o reprográmalas primero.',
        );
      }
    }
  }
}
