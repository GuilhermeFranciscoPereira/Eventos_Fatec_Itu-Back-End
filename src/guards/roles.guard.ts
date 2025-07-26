import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const roles: string[] = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
        if (!roles) return true;
        const user = context.switchToHttp().getRequest().user;
        return roles.includes(user.role);
    }
}
