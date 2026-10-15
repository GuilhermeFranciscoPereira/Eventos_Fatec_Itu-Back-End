import { Request } from 'express';
import { AuditActor } from './audit.context';
import { AuditOutcome, Role } from '@prisma/client';
import { HttpException, Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { AuditResource } from '../../decorators/audit.decorator';

export type AuthenticatedUser = {
  userId: number;
  name?: string;
  email: string;
  role: Role;
};

export type AuditRequest = Request & {
  user?: AuthenticatedUser;
  file?: Express.Multer.File;
  auditRecorded?: boolean;
};

const KNOWN_RESOURCES: ReadonlySet<string> = new Set<AuditResource>(['auth', 'users', 'profile', 'events', 'participants', 'carousel', 'categories', 'courses', 'locations']);
// Expired sessions (401) are routine and the front-end renews them, so only refusals the person caused are "denied".
const DENIED_STATUS = new Set([401, 403, 429]);

export function outcomeFromStatus(status: number): AuditOutcome {
  if (status < 400) return AuditOutcome.SUCCESS;
  return DENIED_STATUS.has(status) ? AuditOutcome.DENIED : AuditOutcome.ERROR;
}

export function actorFromRequest(user?: AuthenticatedUser): AuditActor | null {
  if (!user?.userId) return null;
  return { id: user.userId, name: user.name ?? user.email, email: user.email, role: user.role };
}

export function resourceFromController(controller: Type<unknown>): AuditResource {
  const path = Reflect.getMetadata(PATH_METADATA, controller) as string | string[] | undefined;
  const first = (Array.isArray(path) ? path[0] : path)?.replace(/^\/+/, '').split('/')[0] ?? '';
  return KNOWN_RESOURCES.has(first) ? (first as AuditResource) : 'other';
}

// Only messages written for the user are kept: unexpected errors may carry internal details, so they get a generic text.
export function describeError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const raw = typeof response === 'string' ? response : (response as { message?: unknown }).message;
    const message = Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : error.message;
    return { status: error.getStatus(), message };
  }
  return { status: 500, message: 'Erro interno do servidor.' };
}

export function requestOrigin(req: Request): { method: string; path: string; ip: string | null; userAgent: string | null } {
  return {
    method: req.method,
    path: req.originalUrl ?? req.url,
    ip: req.ip ?? null,
    userAgent: req.get?.('user-agent') ?? null,
  };
}
