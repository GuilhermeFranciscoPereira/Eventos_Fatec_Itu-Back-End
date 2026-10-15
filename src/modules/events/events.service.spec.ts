import { EventsService } from './events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('EventsService - Unitary Test', () => {
  let service: EventsService;
  let prisma: any;

  const publicRow = {
    id: 1,
    name: 'Hackathon',
    description: 'Descrição',
    imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg',
    eventCourses: [{ course: { id: 2, name: 'ADS' } }],
    semester: 'ALL',
    maxParticipants: 50,
    currentParticipants: 10,
    isRestricted: false,
    locationId: 3,
    location: { name: 'Auditório' },
    customLocation: null,
    speakerName: 'Prof. Silva',
    startDate: new Date('2026-11-20T00:00:00.000Z'),
    endDate: null,
    startTime: new Date('2026-11-20T19:00:00.000Z'),
    endTime: new Date('2026-11-20T22:00:00.000Z'),
    duration: null,
    categoryId: null,
  };

  beforeEach(async () => {
    prisma = {
      event: { findUnique: jest.fn() },
      participant: { findFirst: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
  });

  describe('findOnePublic', () => {
    it('should not query participants or the presence secret', async () => {
      prisma.event.findUnique.mockResolvedValue(publicRow);
      await service.findOnePublic(1);
      const { select } = prisma.event.findUnique.mock.calls[0][0];
      expect(select).not.toHaveProperty('participants');
      expect(select).not.toHaveProperty('presenceSecret');
    });
    it('should return only public fields', async () => {
      prisma.event.findUnique.mockResolvedValue(publicRow);
      const result = await service.findOnePublic(1);
      expect(result).not.toHaveProperty('participants');
      expect(result).not.toHaveProperty('presenceSecret');
      expect(result).toMatchObject({ id: 1, locationName: 'Auditório', courseIds: [2], courseNames: ['ADS'] });
    });
    it('should throw NotFoundException when the event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findOnePublic(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should not load the participants list', async () => {
      prisma.event.findUnique.mockResolvedValue({ ...publicRow, presenceSecret: 'segredo' });
      const result = await service.findOne(1);
      expect(prisma.event.findUnique.mock.calls[0][0].include).not.toHaveProperty('participants');
      expect(result).toMatchObject({ presenceSecret: 'segredo' });
    });
  });

  describe('validatePresence', () => {
    beforeEach(() => {
      prisma.event.findUnique.mockResolvedValue({ id: 1, presenceSecret: 'segredo' });
    });

    it('should reject a wrong secret', async () => {
      await expect(service.validatePresence(1, 5, { presenceSecret: 'errado', email: 'maria@fatec.sp.gov.br' })).rejects.toThrow(ForbiddenException);
      expect(prisma.participant.update).not.toHaveBeenCalled();
    });
    it('should only find the participant by the registration e-mail', async () => {
      prisma.participant.findFirst.mockResolvedValue(null);
      await expect(service.validatePresence(1, 5, { presenceSecret: 'segredo', email: 'outra@fatec.sp.gov.br' })).rejects.toThrow(NotFoundException);
      expect(prisma.participant.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 5, eventId: 1, email: 'outra@fatec.sp.gov.br' },
      }));
      expect(prisma.participant.update).not.toHaveBeenCalled();
    });
    it('should mark the participant as present', async () => {
      prisma.participant.findFirst.mockResolvedValue({ id: 5, isPresent: false });
      await expect(service.validatePresence(1, 5, { presenceSecret: 'segredo', email: 'maria@fatec.sp.gov.br' })).resolves.toMatchObject({ isPresent: true });
      expect(prisma.participant.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { isPresent: true } });
    });
  });
});
