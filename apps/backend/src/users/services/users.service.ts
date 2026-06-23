import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';

const BCRYPT_ROUNDS = 12;

/**
 * UsersService — gestión de usuarios (solo ADMIN). Lógica de negocio (H-01).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Notificación de usuario desactivado.
   * UsersService NO depende de NotificationsService (auth-service no importa
   * NotificationsModule). La notificación interna se genera desde el dominio de
   * booking-service; aquí queda como no-op no bloqueante.
   */
  private async notifyUserDeactivated(_userId: string): Promise<void> {
    // no-op (sin dependencia cruzada con NotificationsModule)
  }

  /** Genera una contraseña temporal con al menos una mayúscula y un número. */
  private generateTemporaryPassword(): string {
    const random = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return `A${random}9`.slice(0, 14);
  }

  private sanitize(user: User & { role?: { name: string } }) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  /**
   * Crea un usuario con contraseña temporal (H-01). Devuelve la temporal UNA
   * vez para entrega al admin (no se vuelve a exponer; no se loguea).
   */
  async create(dto: CreateUserDto, actorId: string, ipAddress?: string) {
    const role = await this.usersRepository.findRoleByName(dto.role);
    if (!role) {
      throw new NotFoundException(`Rol no encontrado: ${dto.role}`);
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    let created: User & { role: { name: string } };
    try {
      created = await this.usersRepository.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        temporaryPassword: true,
        mustChangePassword: true,
        role: { connect: { id: role.id } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }
      throw error;
    }

    await this.auditService.record({
      userId: actorId,
      action: AuditAction.CREATE_USER,
      entityType: AuditEntity.USER,
      entityId: created.id,
      success: true,
      newValues: { email: created.email, role: role.name },
      ipAddress,
    });

    return {
      user: this.sanitize(created),
      temporaryPassword, // entregar al admin una sola vez
    };
  }

  async findAll(query: {
    status?: UserStatus;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const result = await this.usersRepository.findMany(query);
    return { ...result, items: result.items.map((u) => this.sanitize(u)) };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, ipAddress?: string) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
    };
    if (dto.role) {
      const role = await this.usersRepository.findRoleByName(dto.role);
      if (!role) {
        throw new NotFoundException(`Rol no encontrado: ${dto.role}`);
      }
      data.role = { connect: { id: role.id } };
    }

    const updated = await this.usersRepository.update(id, data);
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.UPDATE_USER,
      entityType: AuditEntity.USER,
      entityId: id,
      success: true,
      newValues: { ...dto },
      ipAddress,
    });
    return this.sanitize(updated);
  }

  async changeStatus(id: string, status: UserStatus, actorId: string, ipAddress?: string) {
    await this.findOne(id);
    const updated = await this.usersRepository.update(id, { status });

    const action =
      status === UserStatus.ACTIVE ? AuditAction.UPDATE_USER : AuditAction.DISABLE_USER;
    await this.auditService.record({
      userId: actorId,
      action,
      entityType: AuditEntity.USER,
      entityId: id,
      success: true,
      newValues: { status },
      ipAddress,
    });

    if (status === UserStatus.INACTIVE) {
      await this.notifyUserDeactivated(id);
    }
    return this.sanitize(updated);
  }

  /** Borrado lógico (DF-008 / RN-020): status = INACTIVE. */
  async softDelete(id: string, actorId: string, ipAddress?: string) {
    await this.findOne(id);
    const updated = await this.usersRepository.update(id, { status: UserStatus.INACTIVE });
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.DISABLE_USER,
      entityType: AuditEntity.USER,
      entityId: id,
      success: true,
      newValues: { status: UserStatus.INACTIVE },
      ipAddress,
    });

    await this.notifyUserDeactivated(id);
    return this.sanitize(updated);
  }
}
