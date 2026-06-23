import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

/**
 * Tests básicos de AuthService (Fase 5).
 * Se mockean Prisma, JwtService y AuditService.
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let auditService: any;

  const baseUser = {
    id: 'u1',
    firstName: 'Admin',
    lastName: 'Alpha',
    email: 'admin@corporativoalpha.com',
    passwordHash: '',
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    role: { name: 'ADMIN' },
  };

  beforeEach(async () => {
    baseUser.passwordHash = await bcrypt.hash('Admin123', 4);
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(baseUser),
        update: jest.fn().mockResolvedValue(baseUser),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma, jwtService, auditService);
  });

  it('inicia sesión con credenciales válidas y audita LOGIN', async () => {
    const result = await service.login('admin@corporativoalpha.com', 'Admin123', '127.0.0.1');
    expect(result.token).toBe('signed.jwt.token');
    expect(result.user.email).toBe('admin@corporativoalpha.com');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', success: true }),
    );
  });

  it('rechaza contraseña incorrecta y audita el fallo', async () => {
    await expect(
      service.login('admin@corporativoalpha.com', 'wrong', '127.0.0.1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', success: false }),
    );
  });

  it('rechaza usuario no activo', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, status: UserStatus.BLOCKED });
    await expect(
      service.login('admin@corporativoalpha.com', 'Admin123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('correo inexistente: error genérico sin auditar en BD', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.login('nope@x.com', 'Admin123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('logout audita LOGOUT', async () => {
    await service.logout({ id: 'u1', email: 'a@b.com', role: 'ADMIN' }, '127.0.0.1');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', success: true }),
    );
  });
});
