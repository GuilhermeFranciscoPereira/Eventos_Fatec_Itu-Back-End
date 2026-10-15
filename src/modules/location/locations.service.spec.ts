import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('LocationsService - Unitary Test', () => {
  let service: LocationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      location: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new LocationsService(prisma as PrismaService);
  });

  describe('create', () => {
    it('throws when the name already exists', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.create({ name: 'Auditório' })).rejects.toThrow(ConflictException);
    });

    it('creates the location', async () => {
      prisma.location.findUnique.mockResolvedValue(null);
      prisma.location.create.mockResolvedValue({ id: 2, name: 'Laboratório 1' });
      await expect(service.create({ name: 'Laboratório 1' })).resolves.toEqual({ id: 2, name: 'Laboratório 1' });
    });
  });

  describe('update', () => {
    it('throws when the location does not exist', async () => {
      prisma.location.findUnique.mockResolvedValue(null);
      await expect(service.update(9, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws when another location already has the name', async () => {
      prisma.location.findUnique.mockResolvedValueOnce({ id: 1, name: 'A' }).mockResolvedValueOnce({ id: 2, name: 'B' });
      await expect(service.update(1, { name: 'B' })).rejects.toThrow(ConflictException);
    });

    it('accepts saving the same name again', async () => {
      prisma.location.findUnique.mockResolvedValueOnce({ id: 1, name: 'A' }).mockResolvedValueOnce({ id: 1, name: 'A' });
      prisma.location.update.mockResolvedValue({ id: 1, name: 'A' });
      await expect(service.update(1, { name: 'A' })).resolves.toEqual({ id: 1, name: 'A' });
    });
  });

  describe('delete', () => {
    it('throws when the location does not exist', async () => {
      prisma.location.findUnique.mockResolvedValue(null);
      await expect(service.delete(9)).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete a location used by events', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 1, Event: [{ id: 3 }] });
      await expect(service.delete(1)).rejects.toThrow(ConflictException);
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it('deletes a location without events', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 1, Event: [] });
      await expect(service.delete(1)).resolves.toEqual({ message: 'Local deletado com sucesso.' });
    });
  });
});
