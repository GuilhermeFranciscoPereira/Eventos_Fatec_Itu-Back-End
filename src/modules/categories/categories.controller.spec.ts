import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { NotFoundException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService) as jest.Mocked<CategoriesService>;
  });

  describe('Success paths', () => {
    it('findAll → should return array of categories', async () => {
      const result: CategoryResponseDto[] = [
        { id: 1, name: 'Category1', createdAt: new Date(), updatedAt: new Date() },
      ];
      service.findAll.mockResolvedValue(result);
      await expect(controller.findAll()).resolves.toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('create → should call service.create and return created category', async () => {
      const dto: CreateCategoryDto = { name: 'NewCategory' };
      const response: CategoryResponseDto = { id: 2, name: 'NewCategory', createdAt: new Date(), updatedAt: new Date() };
      service.create.mockResolvedValue(response);
      await expect(controller.create(dto)).resolves.toEqual(response);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('update → should call service.update and return updated category', async () => {
      const dto: UpdateCategoryDto = { name: 'UpdatedCategory' };
      const response: CategoryResponseDto = { id: 3, name: 'UpdatedCategory', createdAt: new Date(), updatedAt: new Date() };
      service.update.mockResolvedValue(response);
      await expect(controller.update(3, dto)).resolves.toEqual(response);
      expect(service.update).toHaveBeenCalledWith(3, dto);
    });

    it('delete → should call service.delete and return deletion result', async () => {
      const response = { message: 'Category deleted' };
      service.delete.mockResolvedValue(response);
      await expect(controller.delete(4)).resolves.toEqual(response);
      expect(service.delete).toHaveBeenCalledWith(4);
    });
  });

  describe('Error paths', () => {
    it('findAll → should propagate errors', async () => {
      service.findAll.mockRejectedValue(new Error('Find all failed'));
      await expect(controller.findAll()).rejects.toThrow('Find all failed');
    });

    it('create → should propagate errors', async () => {
      const dto: CreateCategoryDto = { name: 'X' };
      service.create.mockRejectedValue(new Error('Create failed'));
      await expect(controller.create(dto)).rejects.toThrow('Create failed');
    });

    it('update → should propagate errors', async () => {
      const dto: UpdateCategoryDto = { name: 'X' };
      service.update.mockRejectedValue(new Error('Update failed'));
      await expect(controller.update(5, dto)).rejects.toThrow('Update failed');
    });

    it('delete → should propagate NotFoundException', async () => {
      service.delete.mockRejectedValue(new NotFoundException('Not found'));
      await expect(controller.delete(6)).rejects.toThrow(NotFoundException);
    });
  });
});
