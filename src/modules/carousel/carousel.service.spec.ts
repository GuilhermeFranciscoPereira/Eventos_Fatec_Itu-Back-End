import { CarouselService } from './carousel.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

type CarouselRow = { id: number; name: string; imageUrl: string; isActive: boolean; order: number };

// In-memory Carousel table: the service reorders items inside transactions, so the test follows the real data.
function createCarouselTable(initial: CarouselRow[]) {
  const rows = initial.map(row => ({ ...row }));
  let nextId = Math.max(0, ...rows.map(row => row.id)) + 1;
  const byOrder = () => [...rows].sort((a, b) => a.order - b.order);
  const find = (id: number) => rows.find(row => row.id === id);

  return {
    rows,
    findMany: jest.fn(async (args?: { select?: { id: true } }) => byOrder().map(row => (args?.select ? { id: row.id } : { ...row }))),
    findFirst: jest.fn(async ({ where }) => rows.find(row => row.name === where.name && (!where.id?.not || row.id !== where.id.not)) ?? null),
    findUnique: jest.fn(async ({ where }) => (find(where.id) ? { ...find(where.id)! } : null)),
    findUniqueOrThrow: jest.fn(async ({ where }) => ({ ...find(where.id)! })),
    count: jest.fn(async () => rows.length),
    aggregate: jest.fn(async () => ({ _max: { order: rows.length ? Math.max(...rows.map(row => row.order)) : null } })),
    create: jest.fn(async ({ data }) => {
      const row = { id: nextId++, ...data };
      rows.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where, data }) => {
      const row = find(where.id)!;
      for (const [key, value] of Object.entries(data)) if (value !== undefined) (row as Record<string, unknown>)[key] = value;
      return { ...row };
    }),
    delete: jest.fn(async ({ where }) => {
      rows.splice(rows.findIndex(row => row.id === where.id), 1);
    }),
  };
}

describe('CarouselService - Unitary Test', () => {
  let service: CarouselService;
  let prisma: any;
  let cloudinary: any;

  const file = { originalname: 'banner.jpg', path: '/tmp/upload-1', size: 1000 } as Express.Multer.File;
  const orderOf = () => [...prisma.carousel.rows].sort((a, b) => a.order - b.order).map((row: CarouselRow) => row.name);

  beforeEach(() => {
    prisma = {
      carousel: createCarouselTable([
        { id: 1, name: 'A', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/app_uploads/a.jpg', isActive: true, order: 1 },
        { id: 2, name: 'B', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/app_uploads/b.jpg', isActive: true, order: 2 },
      ]),
    };
    prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
    cloudinary = {
      uploadFile: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v2/app_uploads/new.webp' }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new CarouselService(prisma as PrismaService, cloudinary as CloudinaryService);
  });

  it('findAll returns sorted list', async () => {
    await expect(service.findAll()).resolves.toEqual([expect.objectContaining({ name: 'A' }), expect.objectContaining({ name: 'B' })]);
    expect(prisma.carousel.findMany).toHaveBeenCalledWith({ orderBy: { order: 'asc' } });
  });

  describe('create', () => {
    it('throws if no file', async () => {
      await expect(service.create({ name: 'C', isActive: true }, undefined as any)).rejects.toThrow(ConflictException);
    });

    it('throws on duplicate name', async () => {
      await expect(service.create({ name: 'A', isActive: true }, file)).rejects.toThrow(ConflictException);
      expect(cloudinary.uploadFile).not.toHaveBeenCalled();
    });

    it('throws when the order is outside the list', async () => {
      await expect(service.create({ name: 'C', isActive: true, order: 5 }, file)).rejects.toThrow(BadRequestException);
      expect(cloudinary.uploadFile).not.toHaveBeenCalled();
    });

    it('creates a new carousel item in the chosen position', async () => {
      const created = await service.create({ name: 'C', isActive: true, order: 1 }, file);
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
      expect(created).toMatchObject({ name: 'C', order: 1, imageUrl: expect.stringContaining('new.webp') });
      expect(orderOf()).toEqual(['C', 'A', 'B']);
    });
  });

  describe('update', () => {
    it('throws if not found', async () => {
      await expect(service.update(99, { name: 'X' }, file)).rejects.toThrow(NotFoundException);
    });

    it('throws on name clash', async () => {
      await expect(service.update(1, { name: 'B' }, undefined)).rejects.toThrow(ConflictException);
    });

    it('throws when the order is outside the list', async () => {
      await expect(service.update(1, { order: 3 }, undefined)).rejects.toThrow(BadRequestException);
    });

    it('updates with new file, moves the item and removes the old image afterwards', async () => {
      const updated = await service.update(1, { name: 'A2', order: 2 }, file);
      expect(updated).toMatchObject({ id: 1, name: 'A2', order: 2, imageUrl: expect.stringContaining('new.webp') });
      expect(orderOf()).toEqual(['B', 'A2']);
      expect(cloudinary.deleteFile).toHaveBeenCalledWith('app_uploads/a');
    });
  });

  describe('toggleActive', () => {
    it('throws if not found', async () => {
      await expect(service.toggleActive(99, false)).rejects.toThrow(NotFoundException);
    });

    it('toggles active flag', async () => {
      await expect(service.toggleActive(1, false)).resolves.toMatchObject({ id: 1, isActive: false });
      expect(prisma.carousel.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isActive: false } });
    });
  });

  describe('delete', () => {
    it('throws if not found', async () => {
      await expect(service.delete(99)).rejects.toThrow(NotFoundException);
    });

    it('deletes item and file and closes the gap in the order', async () => {
      await expect(service.delete(1)).resolves.toEqual({ message: 'Item do carrossel deletado com sucesso.' });
      expect(prisma.carousel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(cloudinary.deleteFile).toHaveBeenCalledWith('app_uploads/a');
      expect(prisma.carousel.rows).toEqual([expect.objectContaining({ name: 'B', order: 1 })]);
    });
  });
});
