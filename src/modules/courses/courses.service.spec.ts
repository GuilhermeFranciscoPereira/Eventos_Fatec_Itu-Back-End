import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CoursesService - Unitary Test', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      course: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CoursesService(prisma as PrismaService);
  });

  it('findAllPublic returns only id and name in alphabetical order', async () => {
    prisma.course.findMany.mockResolvedValue([{ id: 1, name: 'ADS' }]);
    await expect(service.findAllPublic()).resolves.toEqual([{ id: 1, name: 'ADS' }]);
    expect(prisma.course.findMany).toHaveBeenCalledWith({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  });

  describe('create', () => {
    it('throws when the name already exists', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.create({ name: 'ADS' })).rejects.toThrow(ConflictException);
    });

    it('creates the course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue({ id: 2, name: 'GTI' });
      await expect(service.create({ name: 'GTI' })).resolves.toEqual({ id: 2, name: 'GTI' });
    });
  });

  describe('update', () => {
    it('throws when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.update(9, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws when the new name belongs to another course', async () => {
      prisma.course.findUnique.mockResolvedValueOnce({ id: 1, name: 'ADS' }).mockResolvedValueOnce({ id: 2, name: 'GTI' });
      await expect(service.update(1, { name: 'GTI' })).rejects.toThrow(ConflictException);
    });

    it('updates the course', async () => {
      prisma.course.findUnique.mockResolvedValueOnce({ id: 1, name: 'ADS' }).mockResolvedValueOnce(null);
      prisma.course.update.mockResolvedValue({ id: 1, name: 'Análise e Desenvolvimento de Sistemas' });
      await service.update(1, { name: 'Análise e Desenvolvimento de Sistemas' });
      expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Análise e Desenvolvimento de Sistemas' } });
    });
  });

  describe('delete', () => {
    it('throws when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.delete(9)).rejects.toThrow(NotFoundException);
    });

    it('deletes the course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.delete(1)).resolves.toEqual({ message: 'Curso deletado com sucesso.' });
      expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
