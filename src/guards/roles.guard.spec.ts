import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';

class UsersLikeController {
  handler() { return null; }
}
Reflect.defineMetadata('path', 'users', UsersLikeController);
Reflect.defineMetadata(ROLES_KEY, ['ADMIN'], UsersLikeController);

describe('RolesGuard - Unitary Test', () => {
  let auditService: any;
  let guard: RolesGuard;

  beforeEach(() => {
    auditService = { recordAccessDenied: jest.fn().mockResolvedValue(undefined) };
    guard = new RolesGuard(new Reflector(), auditService);
  });

  function context(user?: Record<string, unknown>): ExecutionContext {
    const request = { user, method: 'GET', originalUrl: '/users', params: {}, get: () => 'agent' };
    return {
      getHandler: () => UsersLikeController.prototype.handler,
      getClass: () => UsersLikeController,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('should allow the roles of the route without writing to the trail', async () => {
    await expect(guard.canActivate(context({ userId: 1, role: 'ADMIN' }))).resolves.toBe(true);
    expect(auditService.recordAccessDenied).not.toHaveBeenCalled();
  });

  it('should refuse other roles and record the attempt', async () => {
    await expect(guard.canActivate(context({ userId: 2, role: 'AUXILIAR' }))).resolves.toBe(false);
    expect(auditService.recordAccessDenied).toHaveBeenCalledWith(expect.objectContaining({ user: { userId: 2, role: 'AUXILIAR' } }), UsersLikeController, ['ADMIN'], undefined);
  });

  it('should refuse a request without user instead of crashing', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(false);
  });
});
