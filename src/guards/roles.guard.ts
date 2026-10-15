import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuditService } from '../modules/audit/audit.service';
import { AuditRequest } from '../modules/audit/audit.utils';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @Optional() private readonly auditService?: AuditService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!roles || roles.length === 0) return true;

        const request = context.switchToHttp().getRequest<AuditRequest>();
        const user = request.user;
        const allowed = !!user && roles.includes(user.role);

        // The interface hides what a profile cannot use, so a refused call is worth keeping in the audit trail.
        if (!allowed && this.auditService) {
            const audit = this.reflector.get<AuditOptions | undefined>(AUDIT_KEY, context.getHandler());
            await this.auditService.recordAccessDenied(request, context.getClass(), roles, audit?.resource);
        }

        return allowed;
    }
}
