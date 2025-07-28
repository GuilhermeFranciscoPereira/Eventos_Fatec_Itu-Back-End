import { CarouselService } from './carousel.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CarouselService - Unitary Test', () => {
  let service: CarouselService;
  let prisma: any;
  let cloudinary: any;

  beforeEach(() => {
    prisma = {
      carousel: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    cloudinary = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    service = new CarouselService(prisma as PrismaService, cloudinary as CloudinaryService);
  });

  it('findAll returns sorted list', async () => {
    const list = [{ id: 1 }];
    prisma.carousel.findMany.mockResolvedValue(list);
    await expect(service.findAll()).resolves.toBe(list);
    expect(prisma.carousel.findMany).toHaveBeenCalledWith({ orderBy: { order: 'asc' } });
  });

  describe('create', () => {
    const dto = { name: 'A', isActive: true, order: 1 };
    const file = { originalname: 'f', buffer: Buffer.from('') } as Express.Multer.File;

    it('throws if no file', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toThrow(ConflictException);
    });

    it('throws on duplicate name', async () => {
      prisma.carousel.findFirst.mockResolvedValueOnce({}).mockResolvedValueOnce(null);
      await expect(service.create(dto, file)).rejects.toThrow(ConflictException);
    });

    it('throws on duplicate order', async () => {
      prisma.carousel.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.create(dto, file)).rejects.toThrow(ConflictException);
    });

    it('creates a new carousel item', async () => {
      prisma.carousel.findFirst.mockResolvedValue(null);
      cloudinary.uploadFile.mockResolvedValue({ secure_url: 'url' });
      const created = { id: 1, name: 'A', imageUrl: 'url', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() };
      prisma.carousel.create.mockResolvedValue(created);
      await expect(service.create(dto, file)).resolves.toEqual(created);
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
      expect(prisma.carousel.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const dto = { name: 'B', order: 2 };
    const file = { originalname: 'f', buffer: Buffer.from('') } as Express.Multer.File;
    const existing = { id: 1, name: 'A', imageUrl: 'u', isActive: true, order: 1 };

    it('throws if not found', async () => {
      prisma.carousel.findUnique.mockResolvedValue(null);
      await expect(service.update(1, dto, file)).rejects.toThrow(NotFoundException);
    });

    it('throws on name clash', async () => {
      prisma.carousel.findUnique.mockResolvedValue(existing);
      prisma.carousel.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.update(1, { name: 'B' }, undefined)).rejects.toThrow(ConflictException);
    });

    it('throws on order clash', async () => {
      prisma.carousel.findUnique.mockResolvedValue(existing);
      prisma.carousel.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.update(1, { order: 2 }, undefined)).rejects.toThrow(ConflictException);
    });

    it('updates with new file', async () => {
      prisma.carousel.findUnique.mockResolvedValue(existing);
      prisma.carousel.findFirst.mockResolvedValue(null);
      cloudinary.uploadFile.mockResolvedValue({ secure_url: 'new' });
      const updated = { ...existing, name: 'B', imageUrl: 'new', order: 2 };
      prisma.carousel.update.mockResolvedValue(updated);
      await expect(service.update(1, dto, file)).resolves.toEqual(updated);
      expect(cloudinary.deleteFile).toHaveBeenCalled();
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
      expect(prisma.carousel.update).toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('throws if not found', async () => {
      prisma.carousel.findUnique.mockResolvedValue(null);
      await expect(service.toggleActive(1, false)).rejects.toThrow(NotFoundException);
    });

    it('toggles active flag', async () => {
      const item = { id: 1, isActive: true };
      prisma.carousel.findUnique.mockResolvedValue(item);
      const updated = { ...item, isActive: false };
      prisma.carousel.update.mockResolvedValue(updated);
      await expect(service.toggleActive(1, false)).resolves.toEqual(updated);
      expect(prisma.carousel.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isActive: false } });
    });
  });

  describe('delete', () => {
    it('throws if not found', async () => {
      prisma.carousel.findUnique.mockResolvedValue(null);
      await expect(service.delete(1)).rejects.toThrow(NotFoundException);
    });

    it('deletes item and file', async () => {
      const exists = { id: 1, imageUrl: 'http://c/p.jpg' };
      prisma.carousel.findUnique.mockResolvedValue(exists);
      prisma.carousel.delete.mockResolvedValue(undefined);
      await expect(service.delete(1)).resolves.toEqual({ message: 'Item do carrossel deletado com sucesso.' });
      expect(cloudinary.deleteFile).toHaveBeenCalled();
      expect(prisma.carousel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
