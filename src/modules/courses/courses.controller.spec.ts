import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { AUDIT_KEY } from '../../decorators/audit.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('CoursesController - Unitary Test', () => {
  let controller: CoursesController;
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
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: service }],
    }).compile();
    controller = module.get<CoursesController>(CoursesController);
  });

  it('should keep the public list open to visitors', async () => {
    service.findAllPublic.mockResolvedValue([{ id: 1, name: 'ADS' }]);
    await expect(controller.findAllPublic()).resolves.toEqual([{ id: 1, name: 'ADS' }]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CoursesController.prototype.findAllPublic)).toBe(true);
  });

  it('should forward create, update and delete to the service', async () => {
    await controller.create({ name: 'GTI' });
    await controller.update(2, { name: 'GTI 2' });
    await controller.delete(2);
    expect(service.create).toHaveBeenCalledWith({ name: 'GTI' });
    expect(service.update).toHaveBeenCalledWith(2, { name: 'GTI 2' });
    expect(service.delete).toHaveBeenCalledWith(2);
  });

  it.each([
    ['create', 'CREATE'],
    ['update', 'UPDATE'],
    ['delete', 'DELETE'],
  ])('%s should be recorded in the audit trail', (method, action) => {
    expect(Reflect.getMetadata(AUDIT_KEY, (CoursesController.prototype as any)[method])).toMatchObject({ action, resource: 'courses' });
  });
});
