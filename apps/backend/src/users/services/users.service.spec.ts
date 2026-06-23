import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

/**
 * Tests básicos de UsersService (Fase 5).
 */
describe('UsersService', () => {
  let service: UsersService;
  let repo: any;
  let auditService: any;

  const createdUser = {
    id: 'new-id',
    firstName: 'Carlos',
    lastName: 'Méndez',
    email: 'carlos.mendez@corporativoalpha.com',
    passwordHash: 'hashed',
    status: UserStatus.ACTIVE,
    temporaryPassword: true,
    mustChangePassword: true,
    role: { name: 'COLLABORATOR' },
  };

  beforeEach(() => {
    repo = {
      findRoleByName: jest.fn().mockResolvedValue({ id: 'role-collab', name: 'COLLABORATOR' }),
      create: jest.fn().mockResolvedValue(createdUser),
      findById: jest.fn().mockResolvedValue(createdUser),
      update: jest.fn().mockResolvedValue(createdUser),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new UsersService(repo, auditService);
  });

  it('crea usuario con contraseña temporal y la devuelve una vez', async () => {
    const result = await service.create(
      {
        firstName: 'Carlos',
        lastName: 'Méndez',
        email: 'carlos.mendez@corporativoalpha.com',
        role: 'COLLABORATOR',
      },
      'admin-id',
      '127.0.0.1',
    );
    expect(result.temporaryPassword).toBeDefined();
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    expect((result.user as any).passwordHash).toBeUndefined();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_USER', success: true }),
    );
  });

  it('mapea correo duplicado a 409 Conflict', async () => {
    repo.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '5.12.0',
      }),
    );
    await expect(
      service.create(
        { firstName: 'A', lastName: 'B', email: 'dup@x.com', role: 'COLLABORATOR' },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('findOne lanza 404 si no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('softDelete deja el usuario en INACTIVE y audita DISABLE_USER', async () => {
    await service.softDelete('new-id', 'admin-id', '127.0.0.1');
    expect(repo.update).toHaveBeenCalledWith('new-id', { status: UserStatus.INACTIVE });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DISABLE_USER', success: true }),
    );
  });
});
