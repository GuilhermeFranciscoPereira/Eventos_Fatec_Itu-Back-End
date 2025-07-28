import { ConflictException } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CarouselController } from './carousel.controller';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UpdateCarouselDto } from './dto/update-carousel.dto';

describe('CarouselController - Unitary Test', () => {
  let controller: CarouselController;
  let service: jest.Mocked<CarouselService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarouselController],
      providers: [{
        provide: CarouselService, useValue: {
          findAll: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          toggleActive: jest.fn(),
          delete: jest.fn(),
        }
      }],
    }).compile();

    controller = module.get<CarouselController>(CarouselController);
    service = module.get(CarouselService) as jest.Mocked<CarouselService>;
  });

  it('should return list of carousel items', async () => {
    const items = [{ id: 1, name: 'a', imageUrl: 'u', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() }];
    service.findAll.mockResolvedValue(items);
    await expect(controller.findAll()).resolves.toEqual(items);
    expect(service.findAll).toHaveBeenCalled();
  });

  describe('create', () => {
    const dto: CreateCarouselDto = { name: 'Test', isActive: true, order: 1 };
    const file = { originalname: 'f', buffer: Buffer.from('') } as Express.Multer.File;

    it('should throw if file missing', async () => {
      service.create.mockRejectedValue(new ConflictException('Imagem obrigatória.'));
      await expect(controller.create(dto, undefined as any)).rejects.toThrow(ConflictException);
    });

    it('should call service.create with dto and file', async () => {
      const result = { id: 1, name: 'Test', imageUrl: 'url', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() };
      service.create.mockResolvedValue(result);
      await expect(controller.create(dto, file)).resolves.toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto, file);
    });
  });

  describe('update', () => {
    const dto: UpdateCarouselDto = { name: 'Up' };
    const file = { originalname: 'f', buffer: Buffer.from('') } as Express.Multer.File;

    it('should call service.update', async () => {
      const result = { id: 1, name: 'Up', imageUrl: 'u', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() };
      service.update.mockResolvedValue(result);
      await expect(controller.update(1, dto, file)).resolves.toEqual(result);
      expect(service.update).toHaveBeenCalledWith(1, dto, file);
    });
  });

  describe('toggleActive', () => {
    it('should call service.toggleActive', async () => {
      const result = { id: 1, name: 'n', imageUrl: 'u', isActive: false, order: 1, createdAt: new Date(), updatedAt: new Date() };
      service.toggleActive.mockResolvedValue(result);
      await expect(controller.toggleActive(1, false)).resolves.toEqual(result);
      expect(service.toggleActive).toHaveBeenCalledWith(1, false);
    });
  });

  describe('delete', () => {
    it('should call service.delete and return message', async () => {
      const msg = { message: 'deleted' };
      service.delete.mockResolvedValue(msg);
      await expect(controller.delete(1)).resolves.toEqual(msg);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
