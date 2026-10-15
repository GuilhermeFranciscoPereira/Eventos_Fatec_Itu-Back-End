import { EventsService } from './events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { todayInEventClock } from '../common/event-clock';
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
      event: { findUnique: jest.fn(), findMany: jest.fn() },
      location: { findUnique: jest.fn().mockResolvedValue({ id: 3, name: 'Auditório' }) },
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
  describe('getAvailableDates', () => {
    function addDays(day: string, amount: number): string {
      const date = new Date(`${day}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + amount);
      return date.toISOString().split('T')[0];
    }

    function dayEvent(day: string, start: string, end: string) {
      return {
        startDate: new Date(`${day}T00:00:00.000Z`),
        endDate: null,
        startTime: new Date(`${day}T${start}:00.000Z`),
        endTime: new Date(`${day}T${end}:00.000Z`),
      };
    }

    it('should query the database only once for the whole window', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      const dates = await service.getAvailableDates(3);
      expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
      expect(dates).toHaveLength(90);
      expect(dates[0]).toBe(todayInEventClock());
    });

    it('should leave out a day fully booked and keep a partially booked one', async () => {
      const today = todayInEventClock();
      const fullDay = addDays(today, 1);
      const partialDay = addDays(today, 2);
      prisma.event.findMany.mockResolvedValue([dayEvent(fullDay, '07:00', '22:00'), dayEvent(partialDay, '19:00', '22:00')]);
      const dates = await service.getAvailableDates(3);
      expect(dates).not.toContain(fullDay);
      expect(dates).toContain(partialDay);
    });

    it('should leave out every day covered by a multi-day event', async () => {
      const today = todayInEventClock();
      const first = addDays(today, 3);
      const last = addDays(today, 5);
      prisma.event.findMany.mockResolvedValue([{
        startDate: new Date(`${first}T00:00:00.000Z`),
        endDate: new Date(`${last}T00:00:00.000Z`),
        startTime: new Date(`${first}T07:00:00.000Z`),
        endTime: new Date(`${last}T22:00:00.000Z`),
      }]);
      const dates = await service.getAvailableDates(3);
      expect(dates).not.toContain(first);
      expect(dates).not.toContain(addDays(today, 4));
      expect(dates).not.toContain(last);
      expect(dates).toContain(addDays(today, 6));
    });

    it('should agree with the free times calculated day by day', async () => {
      const day = addDays(todayInEventClock(), 1);
      const events = [dayEvent(day, '07:00', '21:45')];
      prisma.event.findMany.mockResolvedValue(events);
      const dates = await service.getAvailableDates(3);
      const times = await service.getAvailableTimes(3, day);
      expect(times).toEqual([]);
      expect(dates).not.toContain(day);
    });

    it('should return no dates for the "Outros" location', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 9, name: 'Outros' });
      await expect(service.getAvailableDates(9)).resolves.toEqual([]);
      expect(prisma.event.findMany).not.toHaveBeenCalled();
    });
  });
});
