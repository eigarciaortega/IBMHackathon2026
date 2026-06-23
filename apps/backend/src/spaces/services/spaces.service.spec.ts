import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SpaceStatus } from '@prisma/client';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;
  let repo: any;
  let auditService: any;

  const space = {
    id: 'sp1',
    name: 'Sala Creativa',
    spaceType: 'Meeting Room Medium',
    capacity: 8,
    floor: 'Piso 1',
    zone: 'Norte',
    status: SpaceStatus.AVAILABLE,
  };

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue(space),
      findById: jest.fn().mockResolvedValue(space),
      update: jest.fn().mockResolvedValue({ ...space, status: SpaceStatus.INACTIVE }),
      findMany: jest.fn().mockResolvedValue({ items: [space], total: 1, page: 1, limit: 20 }),
      countActiveFutureBookings: jest.fn().mockResolvedValue(0),
      // Por defecto, todos los recursos solicitados son válidos/ACTIVE.
      findActiveResourceIds: jest.fn().mockImplementation((ids: string[]) => Promise.resolve(ids)),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new SpacesService(repo, auditService);
  });

  it('crea espacio y audita CREATE_SPACE', async () => {
    await service.create(
      { name: 'Sala Creativa', spaceType: 'Meeting Room Medium', capacity: 8, floor: 'Piso 1', zone: 'Norte' },
      'admin-id',
      '127.0.0.1',
    );
    expect(repo.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_SPACE', success: true }),
    );
  });

  it('no-ADMIN excluye INACTIVE en la búsqueda', async () => {
    await service.findAll({}, false);
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ excludeInactive: true }));
  });

  it('bloquea desactivar si hay reservas futuras (H-05)', async () => {
    repo.countActiveFutureBookings.mockResolvedValueOnce(2);
    await expect(
      service.changeStatus('sp1', SpaceStatus.MAINTENANCE, 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('softDelete deja INACTIVE y audita DISABLE_SPACE', async () => {
    await service.softDelete('sp1', 'admin-id', '127.0.0.1');
    expect(repo.update).toHaveBeenCalledWith('sp1', { status: SpaceStatus.INACTIVE });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DISABLE_SPACE', success: true }),
    );
  });

  it('findOne lanza 404 si no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza crear espacio con resourceId inexistente (400)', async () => {
    // El repo devuelve menos IDs de los solicitados => alguno no existe.
    repo.findActiveResourceIds.mockResolvedValueOnce([]);
    await expect(
      service.create(
        {
          name: 'Sala X',
          spaceType: 'Meeting Room Small',
          capacity: 4,
          floor: 'Piso 1',
          zone: 'Norte',
          resourceIds: ['11111111-1111-4111-8111-111111111111'],
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza crear espacio con resourceId INACTIVE (400)', async () => {
    // findActiveResourceIds filtra los INACTIVE => longitud distinta.
    repo.findActiveResourceIds.mockResolvedValueOnce([]); // el INACTIVE no se devuelve
    await expect(
      service.create(
        {
          name: 'Sala Y',
          spaceType: 'Meeting Room Small',
          capacity: 4,
          floor: 'Piso 1',
          zone: 'Norte',
          resourceIds: ['22222222-2222-4222-8222-222222222222'],
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
