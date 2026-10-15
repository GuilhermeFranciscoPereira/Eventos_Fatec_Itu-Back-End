import { Reflector } from '@nestjs/core';
import { AuditOutcome } from '@prisma/client';
import { AuditService, AuditSnapshot } from './audit.service';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuditContext, AuditScope } from './audit.context';
import { AuditChange, computeChanges, isSensitiveKey, PROTECTED_VALUE } from './audit-sanitizer';
import { catchError, concatMap, defer, from, Observable, switchMap, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type } from '@nestjs/common';
import { AUDIT_KEY, AuditOptions, AuditResource, SKIP_AUDIT_KEY } from '../../decorators/audit.decorator';
import { actorFromRequest, AuditRequest, describeError, outcomeFromStatus, requestOrigin, resourceFromController } from './audit.utils';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SNAPSHOT_ACTIONS = new Set(['CREATE', 'UPDATE', 'DELETE']);

type FinishContext = {
  req: AuditRequest;
  options: AuditOptions;
  scope: AuditScope;
  before: AuditSnapshot | null;
  useSnapshots: boolean;
  status: number;
  response?: unknown;
  errorMessage?: string;
};

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Records every change made through the API (and the routes marked with @Audit), with who did it, the result
// and the record before and after. Reads are not recorded unless the route asks for it.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [handler, controller])) return next.handle();

    const req = context.switchToHttp().getRequest<AuditRequest>();
    const options = this.reflector.get<AuditOptions | undefined>(AUDIT_KEY, handler) ?? this.fallbackOptions(req, controller);
    if (!options) return next.handle();

    const scope: AuditScope = { details: {} };
    const successStatus = this.reflector.get<number | undefined>(HTTP_CODE_METADATA, handler) ?? (req.method === 'POST' ? 201 : 200);
    const useSnapshots = options.snapshot ?? SNAPSHOT_ACTIONS.has(options.action);

    const pipeline$ = defer(async () => {
      const targetId = this.resolveTargetId(options, req);
      return useSnapshots && targetId ? this.auditService.snapshot(options.resource, targetId) : null;
    }).pipe(
      switchMap(before => next.handle().pipe(
        concatMap(async (response: unknown) => {
          await this.finish({ req, options, scope, before, useSnapshots, status: successStatus, response });
          return response;
        }),
        catchError((error: unknown) => {
          const { status, message } = describeError(error);
          return from(this.finish({ req, options, scope, before, useSnapshots, status, errorMessage: message }))
            .pipe(switchMap(() => throwError(() => error)));
        }),
      )),
    );

    // Runs the handler inside the audit scope so services can add the actor or details of this request.
    return new Observable(subscriber => AuditContext.run(scope, () => pipeline$.subscribe(subscriber)));
  }

  // A change without @Audit is still recorded, with a generic summary, so nothing that alters data goes unnoticed.
  private fallbackOptions(req: AuditRequest, controller: Type<unknown>): AuditOptions | undefined {
    if (!MUTATING_METHODS.has(req.method)) return undefined;
    const action = req.method === 'POST' ? 'CREATE' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';
    return {
      action,
      resource: resourceFromController(controller),
      summary: `Operação ${req.method} em ${(req.route as { path?: string } | undefined)?.path ?? req.path}`,
      snapshot: false,
    };
  }

  private resolveTargetId(options: AuditOptions, req: AuditRequest, response?: unknown): string | null {
    const target = options.target ?? (req.params?.id ? { param: 'id' } : 'none');
    if (target === 'none') return null;
    if (target === 'self') return req.user?.userId ? String(req.user.userId) : null;
    if (target === 'response') {
      const id = (response as { id?: unknown } | null | undefined)?.id;
      return typeof id === 'number' || typeof id === 'string' ? String(id) : null;
    }
    const value = req.params?.[target.param];
    return value ? String(value) : null;
  }

  private requestBody(req: AuditRequest): Record<string, unknown> | null {
    const body = req.body && typeof req.body === 'object' ? { ...(req.body as Record<string, unknown>) } : {};
    if (req.file) {
      body.uploadedFile = { name: req.file.originalname, type: req.file.mimetype, size: formatMegabytes(req.file.size) };
    }
    return Object.keys(body).length ? body : null;
  }

  private async finish(ctx: FinishContext): Promise<void> {
    const { req, options, scope, before, useSnapshots, status, response, errorMessage } = ctx;
    // The same request can only end once, but guards and nested handlers must never create a second row.
    if (req.auditRecorded) return;
    req.auditRecorded = true;

    const outcome = outcomeFromStatus(status);
    const targetId = scope.targetId ?? this.resolveTargetId(options, req, response);
    const after = useSnapshots && outcome === AuditOutcome.SUCCESS && options.action !== 'DELETE' && targetId
      ? await this.auditService.snapshot(options.resource, targetId)
      : null;

    let targetLabel = scope.targetLabel ?? after?.label ?? before?.label ?? null;
    if (!targetLabel && targetId) {
      const labelResource: AuditResource = options.targetResource ?? (options.resource === 'auth' ? 'users' : options.resource);
      targetLabel = (await this.auditService.snapshot(labelResource, targetId))?.label ?? null;
    }

    const changes: AuditChange[] = before && after ? computeChanges(before.data, after.data) : [];
    const body = this.requestBody(req);
    if (options.action === 'UPDATE' && outcome === AuditOutcome.SUCCESS && body) {
      // Passwords are not part of the snapshot, so a new password shows up here as a protected change.
      for (const [key, value] of Object.entries(body)) {
        if (isSensitiveKey(key) && value && !changes.some(change => change.field === key)) {
          changes.push({ field: key, before: PROTECTED_VALUE, after: PROTECTED_VALUE, sensitive: true });
        }
      }
    }

    await this.auditService.record({
      actor: scope.actor ?? actorFromRequest(req.user),
      action: options.action,
      resource: options.resource,
      summary: options.summary,
      targetId,
      targetLabel,
      outcome,
      statusCode: status,
      ...requestOrigin(req),
      errorMessage: errorMessage ?? null,
      before: before?.data ?? null,
      after: after?.data ?? null,
      changes,
      requestBody: body,
      // A screen with personal data is recorded as "who saw it", not as a second copy of that data.
      response: options.action === 'VIEW' ? (Array.isArray(response) ? { totalItems: response.length } : null) : response,
      details: scope.details,
    });
  }
}
