import { LocationsService } from './locations.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { AUDIT_KEY } from '../../decorators/audit.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('LocationsController - Unitary Test', () => {
  let controller: LocationsController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findAllPublic: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: service }],
    }).compile();
    controller = module.get<LocationsController>(LocationsController);
  });

  it('should keep the public list open to visitors', async () => {
    service.findAllPublic.mockResolvedValue([{ id: 1, name: 'Auditório' }]);
    await expect(controller.findAllPublic()).resolves.toEqual([{ id: 1, name: 'Auditório' }]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, LocationsController.prototype.findAllPublic)).toBe(true);
  });

  it('should forward create, update and delete to the service', async () => {
    await controller.create({ name: 'Lab 1' });
    await controller.update(3, { name: 'Lab 2' });
    await controller.delete(3);
    expect(service.create).toHaveBeenCalledWith({ name: 'Lab 1' });
    expect(service.update).toHaveBeenCalledWith(3, { name: 'Lab 2' });
    expect(service.delete).toHaveBeenCalledWith(3);
  });

  it.each([
    ['create', 'CREATE'],
    ['update', 'UPDATE'],
    ['delete', 'DELETE'],
  ])('%s should be recorded in the audit trail', (method, action) => {
    expect(Reflect.getMetadata(AUDIT_KEY, (LocationsController.prototype as any)[method])).toMatchObject({ action, resource: 'locations' });
  });
});
