import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

describe('CategoriesController - Unitary Test', () => {
  let controller: CategoriesController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compile();
    controller = module.get<CategoriesController>(CategoriesController);
  });

  describe('findAll', () => {
    it('should return array of categories', async () => {
      const cats = [{ id: 1, name: 'A', createdAt: new Date(), updatedAt: new Date() }];
      service.findAll.mockResolvedValue(cats);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(cats);
    });
  });

  describe('create', () => {
    it('should call service.create and return created category', async () => {
      const dto = { name: 'B' };
      service.create.mockResolvedValue({ id: 2, name: 'B', createdAt: new Date(), updatedAt: new Date() });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 2, name: 'B', createdAt: expect.any(Date), updatedAt: expect.any(Date) });
    });
  });

  describe('update', () => {
    it('should call service.update and return updated category', async () => {
      const dto = { name: 'C' };
      const updated = { id: 3, name: 'C', createdAt: new Date(), updatedAt: new Date() };
      service.update.mockResolvedValue(updated);
      const result = await controller.update(3, dto);
      expect(service.update).toHaveBeenCalledWith(3, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should call service.delete and return message', async () => {
      service.delete.mockResolvedValue({ message: 'OK' });
      const result = await controller.delete(4);
      expect(service.delete).toHaveBeenCalledWith(4);
      expect(result).toEqual({ message: 'OK' });
    });
  });
});
