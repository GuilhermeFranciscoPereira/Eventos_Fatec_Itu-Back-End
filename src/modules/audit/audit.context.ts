import { Role } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export type AuditActor = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type AuditScope = {
  actor?: AuditActor;
  targetId?: string;
  targetLabel?: string;
  details: Record<string, unknown>;
};

const storage = new AsyncLocalStorage<AuditScope>();

// Lets services add what only they know (who is logging in, which account a code belongs to, an optimized image)
// to the audit record of the current request without receiving the request object. Outside a request it does nothing.
export const AuditContext = {
  run<T>(scope: AuditScope, callback: () => T): T {
    return storage.run(scope, callback);
  },

  setActor(actor: AuditActor): void {
    const scope = storage.getStore();
    if (scope) scope.actor = { id: actor.id, name: actor.name, email: actor.email, role: actor.role };
  },

  setTarget(id: number | string, label?: string): void {
    const scope = storage.getStore();
    if (!scope) return;
    scope.targetId = String(id);
    if (label) scope.targetLabel = label;
  },

  addDetails(details: Record<string, unknown>): void {
    const scope = storage.getStore();
    if (scope) Object.assign(scope.details, details);
  },
};
