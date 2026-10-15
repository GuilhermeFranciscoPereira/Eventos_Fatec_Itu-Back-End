import { SetMetadata } from '@nestjs/common';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN_REQUEST'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  | 'ACCESS_DENIED';

export type AuditResource =
  | 'auth'
  | 'users'
  | 'profile'
  | 'events'
  | 'participants'
  | 'carousel'
  | 'categories'
  | 'courses'
  | 'locations'
  | 'other';

// Where the id of the affected record comes from: a route param, the response body (creations) or the logged user (own profile).
export type AuditTarget = { param: string } | 'response' | 'self' | 'none';

export type AuditOptions = {
  action: AuditAction;
  resource: AuditResource;
  summary: string;
  target?: AuditTarget;
  // What the target id points to when it is not a record of the resource itself (e.g. the event of a participants list).
  targetResource?: AuditResource;
  // Reads the record before and after the operation to show what changed (default: on for creations, edits and removals).
  snapshot?: boolean;
};

export const AUDIT_KEY = 'audit';
export const SKIP_AUDIT_KEY = 'skipAudit';

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);
// For automatic calls that are not an act of the user, such as renewing the session every 15 minutes.
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
