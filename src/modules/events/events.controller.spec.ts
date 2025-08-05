import { Location } from '@prisma/client';
import { EventsService } from './events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';

describe('EventsController - Unitary Test', () => {
  let controller: EventsController;
  let service: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getAvailableDates: jest.fn(),
            getAvailableTimes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(EventsController);
    service = module.get(EventsService);
  });

  it('findAll should return an array of events', async () => {
    const items = [{ id: 1, name: 'E1' }] as any;
    service.findAll.mockResolvedValue(items);
    await expect(controller.findAll()).resolves.toEqual(items);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne should return a single event', async () => {
    const item = { id: 2, name: 'E2' } as any;
    service.findOne.mockResolvedValue(item);
    await expect(controller.findOne(2)).resolves.toEqual(item);
    expect(service.findOne).toHaveBeenCalledWith(2);
  });

  describe('create', () => {
    const dto = { name: 'New' } as any;
    const file = { buffer: Buffer.from('') } as Express.Multer.File;

    it('should call service.create and return event', async () => {
      const created = { id: 3, name: 'New' } as any;
      service.create.mockResolvedValue(created);
      await expect(controller.create(dto, file)).resolves.toEqual(created);
      expect(service.create).toHaveBeenCalledWith(dto, file);
    });
  });

  describe('update', () => {
    const dto = { name: 'Upd' } as any;
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;

    it('should call service.update and return updated event', async () => {
      const updated = { id: 4, name: 'Upd' } as any;
      service.update.mockResolvedValue(updated);
      await expect(controller.update(4, dto, file)).resolves.toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(4, dto, file);
    });
  });

  it('remove should delete and return message', async () => {
    const msg = { message: 'ok' };
    service.remove.mockResolvedValue(msg);
    await expect(controller.remove(5)).resolves.toEqual(msg);
    expect(service.remove).toHaveBeenCalledWith(5);
  });

  it('availabilityDates should return array of strings', async () => {
    service.getAvailableDates.mockResolvedValue(['2025-01-01']);
    await expect(controller.availabilityDates(Location.AUDITORIO))
      .resolves.toEqual(['2025-01-01']);
    expect(service.getAvailableDates).toHaveBeenCalledWith(Location.AUDITORIO);
  });

  it('availabilityTimes should return array of slots', async () => {
    const slots = [{ start: '07:00', end: '08:00' }];
    service.getAvailableTimes.mockResolvedValue(slots);
    await expect(
      controller.availabilityTimes(Location.AUDITORIO, '2025-01-01', '7')
    ).resolves.toEqual(slots);
    expect(service.getAvailableTimes)
      .toHaveBeenCalledWith(Location.AUDITORIO, '2025-01-01', 7);
  });
});
