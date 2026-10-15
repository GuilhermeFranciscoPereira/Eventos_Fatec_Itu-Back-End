import { AuditService } from './audit.service';
import { NotFoundException } from '@nestjs/common';

describe('AuditService - Unitary Test', () => {
  let prisma: any;
  let service: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      event: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    service = new AuditService(prisma, { get: jest.fn().mockReturnValue(undefined) } as any);
  });

  describe('record', () => {
    it('should never store credentials', async () => {
      await service.record({
        action: 'PASSWORD_RESET',
        resource: 'auth',
        summary: 'Redefinição de senha',
        outcome: 'SUCCESS',
        statusCode: 200,
        method: 'POST',
        path: '/auth/reset-password',
        requestBody: { code: '123456', newPassword: 'Nova@123' },
        response: { accessToken: 'abc' },
      });

      const data = prisma.auditLog.create.mock.calls[0][0].data;
      expect(data.requestBody).toEqual({ code: '[PROTEGIDO]', newPassword: '[PROTEGIDO]' });
      expect(data.response).toEqual({ accessToken: '[PROTEGIDO]' });
      expect(JSON.stringify(data)).not.toMatch(/123456|Nova@123|abc/);
    });

    it('should keep the operation working when the trail cannot be written', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'));
      await expect(service.record({
        action: 'LOGOUT', resource: 'auth', summary: 'Logout', outcome: 'SUCCESS', statusCode: 200, method: 'POST', path: '/auth/logout',
      })).resolves.toBeUndefined();
    });
  });

  describe('snapshot', () => {
    it('should flatten the relations of an event into readable names', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 3,
        name: 'Hackathon',
        locationId: 1,
        location: { name: 'Auditório' },
        categoryId: null,
        category: null,
        eventCourses: [{ course: { name: 'ADS' } }, { course: { name: 'GTI' } }],
      });

      await expect(service.snapshot('events', '3')).resolves.toEqual({
        data: { id: 3, name: 'Hackathon', locationId: 1, categoryId: null, location: 'Auditório', category: null, courses: ['ADS', 'GTI'] },
        label: 'Hackathon',
      });
    });

    it('should never read the password of a user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'A', email: 'a@fatec.sp.gov.br' });
      await service.snapshot('users', 1);
      expect(prisma.user.findUnique.mock.calls[0][0].select).not.toHaveProperty('password');
    });

    it('should ignore ids that are not numbers', async () => {
      await expect(service.snapshot('events', 'abc')).resolves.toBeNull();
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should page and filter by period in Brasília time', async () => {
      prisma.auditLog.count.mockResolvedValue(45);
      const result = await service.findAll({ page: 2, pageSize: 20, outcome: 'DENIED', from: '2026-10-01', to: '2026-10-15', search: 'evento' });

      const args = prisma.auditLog.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(20);
      expect(args.where.outcome).toBe('DENIED');
      expect(args.where.createdAt.gte.toISOString()).toBe('2026-10-01T03:00:00.000Z');
      expect(args.where.createdAt.lte.toISOString()).toBe('2026-10-16T02:59:59.999Z');
      expect(args.where.OR).toHaveLength(4);
      expect(result).toMatchObject({ total: 45, page: 2, pageSize: 20, totalPages: 3 });
    });
  });

  describe('findOne', () => {
    it('should throw when the record does not exist', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeExpiredLogs', () => {
    it('should remove records older than one year by default', async () => {
      await service.removeExpiredLogs();
      const limit: Date = prisma.auditLog.deleteMany.mock.calls[0][0].where.createdAt.lt;
      const days = (Date.now() - limit.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(days)).toBe(365);
    });
  });
});
