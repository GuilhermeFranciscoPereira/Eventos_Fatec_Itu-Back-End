import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const ROLES_KEY: string = 'roles';
export const Roles: (...roles: string[]) => CustomDecorator<string> = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);