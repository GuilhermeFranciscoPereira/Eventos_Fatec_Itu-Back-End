import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService - Unitary Test', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('should return categories ordered by createdAt desc', async () => {
      const mock = [{ id: 1, name: 'A', createdAt: new Date(), updatedAt: new Date() }];
      prisma.category.findMany.mockResolvedValue(mock);
      const result = await service.findAll();
      expect(prisma.category.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
      expect(result).toEqual(mock);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if name exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'X', createdAt: new Date(), updatedAt: new Date() });
      await expect(service.create({ name: 'X' })).rejects.toBeInstanceOf(ConflictException);
    });
    it('should create and return category when name is new', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      const dto = { name: 'New' };
      const created = { id: 2, name: 'New', createdAt: new Date(), updatedAt: new Date() };
      prisma.category.create.mockResolvedValue(created);
      await expect(service.create(dto)).resolves.toEqual(created);
      expect(prisma.category.create).toHaveBeenCalledWith({ data: { name: dto.name } });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if id not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.update(1, { name: 'Y' })).rejects.toBeInstanceOf(NotFoundException);
    });
    it('should throw ConflictException if new name clashes', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Old', createdAt: new Date(), updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, name: 'Y', createdAt: new Date(), updatedAt: new Date() });
      await expect(service.update(1, { name: 'Y' })).rejects.toBeInstanceOf(ConflictException);
    });
    it('should update and return category when valid', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 3, name: 'Old', createdAt: new Date(), updatedAt: new Date() })
        .mockResolvedValueOnce(null);
      const updated = { id: 3, name: 'New', createdAt: new Date(), updatedAt: new Date() };
      prisma.category.update.mockResolvedValue(updated);
      await expect(service.update(3, { name: 'New' })).resolves.toEqual(updated);
      expect(prisma.category.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { name: 'New' } });
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if id not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.delete(5)).rejects.toBeInstanceOf(NotFoundException);
    });
    it('should delete and return success message', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 6, name: 'Z', createdAt: new Date(), updatedAt: new Date() });
      prisma.category.delete.mockResolvedValue(undefined);
      await expect(service.delete(6)).resolves.toEqual({ message: 'Categoria deletada com sucesso.' });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 6 } });
    });
  });
});
