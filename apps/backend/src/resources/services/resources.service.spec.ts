import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ResourceStatus } from '@prisma/client';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let repo: any;
  let auditService: any;

  const resource = { id: 'r1', name: 'Projector', description: null, status: ResourceStatus.ACTIVE };

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue(resource),
      findById: jest.fn().mockResolvedValue(resource),
      update: jest.fn().mockResolvedValue({ ...resource, status: ResourceStatus.INACTIVE }),
      findMany: jest.fn().mockResolvedValue({ items: [resource], total: 1, page: 1, limit: 20 }),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ResourcesService(repo, auditService);
  });

  it('crea recurso y audita CREATE_RESOURCE', async () => {
    await service.create({ name: 'Projector' }, 'admin-id', '127.0.0.1');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_RESOURCE', success: true }),
    );
  });

  it('mapea nombre duplicado a 409 Conflict', async () => {
    repo.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5.12.0' }),
    );
    await expect(service.create({ name: 'Projector' }, 'admin-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('softDelete deja INACTIVE y audita DELETE_RESOURCE', async () => {
    await service.softDelete('r1', 'admin-id', '127.0.0.1');
    expect(repo.update).toHaveBeenCalledWith('r1', { status: ResourceStatus.INACTIVE });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE_RESOURCE', success: true }),
    );
  });

  it('no-ADMIN excluye INACTIVE', async () => {
    await service.findAll({}, false);
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ excludeInactive: true }));
  });

  it('findOne lanza 404 si no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
