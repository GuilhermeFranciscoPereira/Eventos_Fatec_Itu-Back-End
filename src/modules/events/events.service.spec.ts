import { Location } from '@prisma/client';
import { EventsService } from './events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('EventsService - Unitary Test', () => {
  let service: EventsService;
  let prisma: any;
  let cloudinary: any;

  const BUSINESS_START = '07:00';
  const BUSINESS_END = '22:00';

  beforeEach(async () => {
    prisma = {
      event: {
        findMany: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('create', () => {
    const dto = {
      location: Location.AUDITORIO,
      startDate: '2025-01-01',
      startTime: '09:00',
      endTime: '10:00',
    } as any;
    const file = { buffer: Buffer.from('') } as Express.Multer.File;

    it('throws if no file provided', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      await expect(service.create(dto, undefined as any))
        .rejects.toThrow(ConflictException);
    });

    it('throws on overlap', async () => {
      prisma.event.findMany.mockResolvedValueOnce([
        { name: 'X', startTime: new Date('2025-01-01T09:30:00Z'), endTime: new Date('2025-01-01T10:30:00Z') }
      ]);
      await expect(service.create(dto, file)).rejects.toThrow(ConflictException);
    });

    it('creates when no overlap', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      cloudinary.uploadFile.mockResolvedValue({ secure_url: 'u' });
      const created = { id: 1, ...dto, imageUrl: 'u' } as any;
      prisma.event.create.mockResolvedValue(created);
      await expect(service.create(dto, file)).resolves.toEqual(created);
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
    });
  });

  describe('update', () => {
    const dto = { startTime: '11:00', endTime: '12:00', location: Location.AUDITORIO } as any;
    const file = { buffer: Buffer.from('f') } as Express.Multer.File;
    const existing = {
      id: 2,
      location: Location.AUDITORIO,
      startDate: new Date('2025-01-02T00:00:00Z'),
      startTime: new Date('2025-01-02T10:00:00Z'),
      endTime: new Date('2025-01-02T11:00:00Z'),
      imageUrl: 'http://x/y.png',
    } as any;

    it('throws if event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.update(2, dto, file)).rejects.toThrow(NotFoundException);
    });

    it('throws on overlap', async () => {
      prisma.event.findUnique.mockResolvedValue(existing);
      prisma.event.findMany.mockResolvedValue([
        { name: 'Y', startTime: new Date('2025-01-02T11:30:00Z'), endTime: new Date('2025-01-02T12:30:00Z') }
      ]);
      await expect(service.update(2, dto, undefined)).rejects.toThrow(ConflictException);
    });

    it('updates with new file', async () => {
      prisma.event.findUnique.mockResolvedValue(existing);
      prisma.event.findMany.mockResolvedValue([]);
      cloudinary.uploadFile.mockResolvedValue({ secure_url: 'new' });
      const updated = { id: 2, ...existing, imageUrl: 'new' } as any;
      prisma.event.update.mockResolvedValue(updated);

      await expect(service.update(2, dto, file)).resolves.toEqual(updated);
      expect(cloudinary.deleteFile).toHaveBeenCalledWith('x/y');
      expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
    });
  });

  describe('getAvailableTimes', () => {
    const date = '2025-01-03';

    it('returns full business hours for OUTROS', async () => {
      const slots = await service.getAvailableTimes(Location.OUTROS, date);
      expect(slots).toEqual([{ start: BUSINESS_START, end: BUSINESS_END }]);
    });

    it('computes free slots around events', async () => {
      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date(`${date}T09:00:00Z`), endTime: new Date(`${date}T10:00:00Z`) }
      ]);
      const slots = await service.getAvailableTimes(Location.AUDITORIO, date);
      expect(slots[0]).toEqual({ start: BUSINESS_START, end: '09:00' });
      expect(slots[1]).toEqual({ start: '10:00', end: BUSINESS_END });
    });
  });

  describe('getAvailableDates', () => {
    it('returns empty for OUTROS', async () => {
      await expect(service.getAvailableDates(Location.OUTROS)).resolves.toEqual([]);
    });

    it('returns only days with free slots', async () => {
      const spy = jest
        .spyOn<any, any>(service, 'hasFreeSlot')
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
      const dates = await service.getAvailableDates(Location.AUDITORIO);
      expect(dates.length).toBe(1);
      spy.mockRestore();
    });
  });

  describe('findAll & findOne', () => {
    it('findAll returns ordered list', async () => {
      const list = [{ id: 1 }];
      prisma.event.findMany.mockResolvedValue(list);
      await expect(service.findAll()).resolves.toBe(list);
    });

    it('findOne throws if missing', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    });

    it('findOne returns event', async () => {
      const ev = { id: 5 };
      prisma.event.findUnique.mockResolvedValue(ev);
      await expect(service.findOne(5)).resolves.toBe(ev);
    });
  });

  describe('remove', () => {
    it('throws if missing', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.remove(7)).rejects.toThrow(NotFoundException);
    });

    it('deletes event and image', async () => {
      const ev = { id: 7, imageUrl: 'http://c/d.jpg' } as any;
      prisma.event.findUnique.mockResolvedValue(ev);
      prisma.event.delete.mockResolvedValue(undefined);
      await expect(service.remove(7)).resolves.toEqual({ message: 'Evento deletado com sucesso.' });
      expect(cloudinary.deleteFile).toHaveBeenCalledWith('c/d');
    });
  });
});
