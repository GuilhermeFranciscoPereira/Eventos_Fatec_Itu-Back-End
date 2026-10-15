import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { AUDIT_KEY } from '../../decorators/audit.decorator';

describe('EventsController - Unitary Test', () => {
  let controller: EventsController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAllPublic: jest.fn(),
      findAll: jest.fn(),
      findByParticipantEmail: jest.fn(),
      findOne: jest.fn(),
      findOnePublic: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      validatePresence: jest.fn(),
      getAvailableDates: jest.fn(),
      getAvailableTimes: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: service }],
    }).compile();
    controller = module.get<EventsController>(EventsController);
  });

  describe('findByParticipantEmail', () => {
    const handler = EventsController.prototype.findByParticipantEmail;

    it('should return the events of the e-mail', async () => {
      service.findByParticipantEmail.mockResolvedValue([{ id: 1 }]);
      await expect(controller.findByParticipantEmail({ email: 'aluno@fatec.sp.gov.br' })).resolves.toEqual([{ id: 1 }]);
      expect(service.findByParticipantEmail).toHaveBeenCalledWith('aluno@fatec.sp.gov.br');
    });

    it('should require a staff session instead of being public', () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['ADMIN', 'COORDENADOR', 'AUXILIAR']);
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('manage/by-participant-email');
    });

    it('should be recorded in the audit trail', () => {
      expect(Reflect.getMetadata(AUDIT_KEY, handler)).toMatchObject({ action: 'VIEW', resource: 'participants' });
    });
  });

  it('should no longer expose any public route by participant e-mail', () => {
    const paths = Object.getOwnPropertyNames(EventsController.prototype)
      .map(name => Reflect.getMetadata(PATH_METADATA, (EventsController.prototype as any)[name]))
      .filter(Boolean);
    expect(paths).not.toContain('public/by-participant-email');
  });

  describe('changes are audited', () => {
    it.each([
      ['create', 'CREATE'],
      ['update', 'UPDATE'],
      ['remove', 'DELETE'],
    ])('%s should carry @Audit', (method, action) => {
      expect(Reflect.getMetadata(AUDIT_KEY, (EventsController.prototype as any)[method])).toMatchObject({ action, resource: 'events' });
    });
  });

  it('should pass the e-mail and secret word of the presence check to the service', async () => {
    service.validatePresence.mockResolvedValue({ message: 'ok', isPresent: true });
    const dto = { email: 'a@fatec.sp.gov.br', presenceSecret: 'palavra' };
    await controller.validatePresence(4, 9, dto as any);
    expect(service.validatePresence).toHaveBeenCalledWith(4, 9, dto);
  });
});
