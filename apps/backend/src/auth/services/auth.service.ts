import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { RoleName } from '../../common/constants/roles.constant';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthenticatedUser, JwtPayload } from '../../common/interfaces/authenticated-user.interface';
import { ChangePasswordDto } from '../dto/change-password.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Inicio de sesión (CU-001). Audita LOGIN (éxito y fallo cuando el usuario
   * existe). Para correos inexistentes no se audita en BD (audit_logs.user_id
   * es NOT NULL); se registra en el logger. Mensaje genérico para no revelar
   * si el correo existe (RN-003).
   */
  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      this.logger.warn(`Login fallido (correo inexistente): ${email} ip=${ipAddress ?? '-'}`);
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.auditService.record({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: AuditEntity.AUTH,
        entityId: user.id,
        success: false,
        ipAddress,
      });
      const message =
        user.status === UserStatus.BLOCKED
          ? 'Tu usuario está bloqueado. Contacta al administrador.'
          : 'Tu usuario no está activo. Contacta al administrador.';
      throw new UnauthorizedException(message);
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await this.auditService.record({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: AuditEntity.AUTH,
        entityId: user.id,
        success: false,
        ipAddress,
      });
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await this.auditService.record({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: AuditEntity.AUTH,
      entityId: user.id,
      success: true,
      ipAddress,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name as RoleName,
    };

    return {
      token: this.jwtService.sign(payload),
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
        status: user.status,
      },
    };
  }

  /**
   * Cierre de sesión (CU-002 / decisión A-01).
   * Audita LOGOUT. No invalida el token en servidor (sin denylist en el MVP);
   * el frontend elimina el JWT local.
   */
  async logout(user: AuthenticatedUser, ipAddress?: string) {
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.LOGOUT,
      entityType: AuditEntity.AUTH,
      entityId: user.id,
      success: true,
      ipAddress,
    });
    return { success: true, message: 'Sesión cerrada correctamente.' };
  }

  /**
   * Perfil del usuario autenticado (GET /auth/profile).
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    };
  }

  /**
   * Cambio de contraseña (decisión H-01). Limpia las banderas de temporal.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const currentOk = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        temporaryPassword: false,
        mustChangePassword: false,
      },
    });

    await this.auditService.record({
      userId,
      action: AuditAction.UPDATE_USER,
      entityType: AuditEntity.USER,
      entityId: userId,
      success: true,
      newValues: { passwordChanged: true },
      ipAddress,
    });

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }
}
