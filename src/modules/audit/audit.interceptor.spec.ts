import { lastValueFrom, of, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditContext } from './audit.context';
import { AuditInterceptor } from './audit.interceptor';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { CallHandler, ConflictException, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AUDIT_KEY, AuditOptions, SKIP_AUDIT_KEY } from '../../decorators/audit.decorator';
import { PROTECTED_VALUE } from './audit-sanitizer';

class FakeController {
  handler() { return null; }
}

describe('AuditInterceptor - Unitary Test', () => {
  let auditService: any;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditService = {
      snapshot: jest.fn().mockResolvedValue(null),
      record: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new AuditInterceptor(new Reflector(), auditService);
    Reflect.deleteMetadata(AUDIT_KEY, FakeController.prototype.handler);
    Reflect.deleteMetadata(SKIP_AUDIT_KEY, FakeController.prototype.handler);
    Reflect.deleteMetadata(HTTP_CODE_METADATA, FakeController.prototype.handler);
  });

  function decorate(options: AuditOptions): void {
    Reflect.defineMetadata(AUDIT_KEY, options, FakeController.prototype.handler);
  }

  function context(req: Record<string, unknown>): ExecutionContext {
    const request = {
      method: 'PATCH',
      originalUrl: '/apiEvents/events/patch/3',
      ip: '10.0.0.1',
      params: {},
      body: {},
      get: () => 'jest-agent',
      ...req,
    };
    return {
      getType: () => 'http',
      getHandler: () => FakeController.prototype.handler,
      getClass: () => FakeController,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  const handlerReturning = (value: unknown): CallHandler => ({ handle: () => of(value) });

  it('should record an edit with the logged user, the record before and after and what changed', async () => {
    decorate({ action: 'UPDATE', resource: 'events', summary: 'Edição de evento' });
    auditService.snapshot
      .mockResolvedValueOnce({ data: { name: 'Antigo', presenceSecret: 'a' }, label: 'Antigo' })
      .mockResolvedValueOnce({ data: { name: 'Novo', presenceSecret: 'b' }, label: 'Novo' });
    const ctx = context({
      params: { id: '3' },
      body: { name: 'Novo', presenceSecret: 'b' },
      user: { userId: 7, name: 'Admin', email: 'admin@fatec.sp.gov.br', role: 'ADMIN' },
    });

    await lastValueFrom(interceptor.intercept(ctx, handlerReturning({ id: 3, name: 'Novo' })));

    expect(auditService.snapshot).toHaveBeenNthCalledWith(1, 'events', '3');
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
      actor: { id: 7, name: 'Admin', email: 'admin@fatec.sp.gov.br', role: 'ADMIN' },
      action: 'UPDATE',
      resource: 'events',
      targetId: '3',
      targetLabel: 'Novo',
      outcome: 'SUCCESS',
      statusCode: 200,
      method: 'PATCH',
      ip: '10.0.0.1',
      before: { name: 'Antigo', presenceSecret: 'a' },
      after: { name: 'Novo', presenceSecret: 'b' },
      changes: [
        { field: 'name', before: 'Antigo', after: 'Novo' },
        { field: 'presenceSecret', before: PROTECTED_VALUE, after: PROTECTED_VALUE, sensitive: true },
      ],
    }));
  });

  it('should use the id of the response for creations and the status of @HttpCode', async () => {
    decorate({ action: 'CREATE', resource: 'categories', summary: 'Criação de categoria', target: 'response' });
    Reflect.defineMetadata(HTTP_CODE_METADATA, 201, FakeController.prototype.handler);
    auditService.snapshot.mockResolvedValue({ data: { id: 12, name: 'Palestras' }, label: 'Palestras' });

    await lastValueFrom(interceptor.intercept(context({ method: 'POST' }), handlerReturning({ id: 12, name: 'Palestras' })));

    expect(auditService.snapshot).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ targetId: '12', statusCode: 201, before: null, after: { id: 12, name: 'Palestras' } }));
  });

  it('should record a refused login as denied and keep throwing the original error', async () => {
    decorate({ action: 'LOGIN_REQUEST', resource: 'auth', summary: 'Login', target: 'none' });
    const error = new UnauthorizedException('E-mail ou senha inválidos.');

    await expect(lastValueFrom(interceptor.intercept(context({ method: 'POST', body: { email: 'x@fatec.sp.gov.br', password: 'errada' } }), { handle: () => throwError(() => error) })))
      .rejects.toBe(error);

    const entry = auditService.record.mock.calls[0][0];
    expect(entry).toMatchObject({ outcome: 'DENIED', statusCode: 401, errorMessage: 'E-mail ou senha inválidos.', actor: null });
    expect(entry.requestBody).toEqual({ email: 'x@fatec.sp.gov.br', password: 'errada' });
  });

  it('should record a business rule error as error', async () => {
    decorate({ action: 'CREATE', resource: 'users', summary: 'Criação de usuário', target: 'response' });
    await expect(lastValueFrom(interceptor.intercept(context({ method: 'POST' }), { handle: () => throwError(() => new ConflictException('E-mail já cadastrado!')) })))
      .rejects.toThrow(ConflictException);
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'ERROR', statusCode: 409, errorMessage: 'E-mail já cadastrado!' }));
  });

  it('should use the actor and details that a service set during the request', async () => {
    decorate({ action: 'LOGIN', resource: 'auth', summary: 'Login com código 2FA', target: 'none' });
    const handler: CallHandler = {
      handle: () => {
        AuditContext.setActor({ id: 5, name: 'Coord', email: 'coord@fatec.sp.gov.br', role: 'COORDENADOR' });
        AuditContext.setTarget(5, 'Coord (coord@fatec.sp.gov.br)');
        AuditContext.addDetails({ accountFound: true });
        return of({ message: 'ok' });
      },
    };

    await lastValueFrom(interceptor.intercept(context({ method: 'POST' }), handler));

    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
      actor: { id: 5, name: 'Coord', email: 'coord@fatec.sp.gov.br', role: 'COORDENADOR' },
      targetId: '5',
      targetLabel: 'Coord (coord@fatec.sp.gov.br)',
      details: { accountFound: true },
    }));
  });

  it('should mark a password sent in an edit as a protected change', async () => {
    decorate({ action: 'UPDATE', resource: 'users', summary: 'Edição de usuário' });
    auditService.snapshot.mockResolvedValue({ data: { name: 'U' }, label: 'U' });
    await lastValueFrom(interceptor.intercept(context({ params: { id: '2' }, body: { password: 'Nova@123' } }), handlerReturning({ id: 2 })));
    expect(auditService.record.mock.calls[0][0].changes).toEqual([{ field: 'password', before: PROTECTED_VALUE, after: PROTECTED_VALUE, sensitive: true }]);
  });

  it('should store only the number of items of a viewed list', async () => {
    decorate({ action: 'VIEW', resource: 'participants', summary: 'Lista', target: { param: 'id' }, targetResource: 'events' });
    auditService.snapshot.mockResolvedValue({ data: {}, label: 'Hackathon' });
    await lastValueFrom(interceptor.intercept(context({ method: 'GET', params: { id: '4' } }), handlerReturning([{ email: 'a' }, { email: 'b' }])));
    expect(auditService.snapshot).toHaveBeenCalledWith('events', '4');
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ targetLabel: 'Hackathon', response: { totalItems: 2 } }));
  });

  it('should record changes without @Audit and ignore reads without it', async () => {
    await lastValueFrom(interceptor.intercept(context({ method: 'GET' }), handlerReturning([])));
    expect(auditService.record).not.toHaveBeenCalled();

    await lastValueFrom(interceptor.intercept(context({ method: 'DELETE', route: { path: '/x/:id' } }), handlerReturning({})));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', resource: 'other' }));
  });

  it('should not record routes marked with @SkipAudit', async () => {
    Reflect.defineMetadata(SKIP_AUDIT_KEY, true, FakeController.prototype.handler);
    await lastValueFrom(interceptor.intercept(context({ method: 'POST' }), handlerReturning({})));
    expect(auditService.record).not.toHaveBeenCalled();
  });
});
