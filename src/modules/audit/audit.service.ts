import { ConfigService } from '@nestjs/config';
import { AuditActor } from './audit.context';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';
import { AuditOutcome, Prisma } from '@prisma/client';
import { AuditAction, AuditResource } from '../../decorators/audit.decorator';
import { AuditChange, limitJsonSize, sanitizeForAudit } from './audit-sanitizer';
import { Injectable, Logger, NotFoundException, Type } from '@nestjs/common';
import { actorFromRequest, AuditRequest, requestOrigin, resourceFromController } from './audit.utils';
import { AuditLogDetailResponseDto, AuditLogListResponseDto } from './dto/audit-log-response.dto';

export type AuditEntry = {
  actor?: AuditActor | null;
  action: AuditAction;
  resource: AuditResource;
  summary: string;
  targetId?: string | null;
  targetLabel?: string | null;
  outcome: AuditOutcome;
  statusCode: number;
  method: string;
  path: string;
  ip?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changes?: AuditChange[];
  requestBody?: unknown;
  response?: unknown;
  details?: Record<string, unknown>;
};

export type AuditSnapshot = {
  data: Record<string, unknown>;
  label: string;
};

// Brazil has had no daylight saving time since 2019, so the offset of the college is fixed.
const BRASILIA_OFFSET = '-03:00';
const DEFAULT_RETENTION_DAYS = 365;

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  const sanitized = limitJsonSize(sanitizeForAudit(value));
  if (sanitized === null || sanitized === undefined) return undefined;
  if (typeof sanitized === 'object' && !Array.isArray(sanitized) && Object.keys(sanitized).length === 0) return undefined;
  return sanitized as Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly retentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const configured = Number(this.config.get<string>('AUDIT_RETENTION_DAYS'));
    this.retentionDays = Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_RETENTION_DAYS;
  }

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actor?.id ?? null,
          actorName: truncate(entry.actor?.name, 120),
          actorEmail: truncate(entry.actor?.email, 191),
          actorRole: entry.actor?.role ?? null,
          action: entry.action,
          resource: entry.resource,
          summary: truncate(entry.summary, 255) ?? entry.action,
          targetId: truncate(entry.targetId, 64),
          targetLabel: truncate(entry.targetLabel, 255),
          outcome: entry.outcome,
          statusCode: entry.statusCode,
          method: truncate(entry.method, 10) ?? 'GET',
          path: truncate(entry.path, 255) ?? '/',
          ip: truncate(entry.ip, 64),
          userAgent: truncate(entry.userAgent, 255),
          errorMessage: truncate(entry.errorMessage, 500),
          before: toJson(entry.before),
          after: toJson(entry.after),
          changes: entry.changes?.length ? toJson(entry.changes) : undefined,
          requestBody: toJson(entry.requestBody),
          response: toJson(entry.response),
          details: toJson(entry.details),
        },
      });
    } catch (err: unknown) {
      // A failure to write the trail must not undo or block what the user just did: it stays in the server log.
      this.logger.error(`Failed to write audit log (${entry.action} ${entry.resource})`, err instanceof Error ? err.stack : String(err));
    }
  }

  // Guards run before the audit interceptor, so a request refused for lack of permission is recorded from here.
  async recordAccessDenied(req: AuditRequest, controller: Type<unknown>, requiredRoles: string[], resource?: AuditResource): Promise<void> {
    if (req.auditRecorded) return;
    req.auditRecorded = true;
    await this.record({
      actor: actorFromRequest(req.user),
      action: 'ACCESS_DENIED',
      resource: resource ?? resourceFromController(controller),
      summary: 'Acesso negado: perfil sem permissão para esta ação',
      targetId: req.params?.id ? String(req.params.id) : null,
      outcome: AuditOutcome.DENIED,
      statusCode: 403,
      ...requestOrigin(req),
      errorMessage: 'Forbidden resource',
      details: { requiredRoles, userRole: req.user?.role ?? null },
    });
  }

  // Current state of the affected record, flattened with the names of its relations so the history reads on its own.
  async snapshot(resource: AuditResource, id: string | number): Promise<AuditSnapshot | null> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;

    try {
      switch (resource) {
        case 'auth':
        case 'users':
        case 'profile': {
          const user = await this.prisma.user.findUnique({
            where: { id: numericId },
            select: { id: true, name: true, email: true, role: true, imageUrl: true, createdAt: true, updatedAt: true },
          });
          return user ? { data: user, label: `${user.name} (${user.email})` } : null;
        }
        case 'events': {
          const event = await this.prisma.event.findUnique({
            where: { id: numericId },
            include: {
              location: { select: { name: true } },
              category: { select: { name: true } },
              eventCourses: { select: { course: { select: { name: true } } }, orderBy: { courseId: 'asc' } },
            },
          });
          if (!event) return null;
          const { location, category, eventCourses, ...data } = event;
          return {
            data: {
              ...data,
              location: location.name,
              category: category?.name ?? null,
              courses: eventCourses.map(({ course }) => course.name),
            },
            label: event.name,
          };
        }
        case 'participants': {
          const participant = await this.prisma.participant.findUnique({
            where: { id: numericId },
            include: { event: { select: { name: true } }, course: { select: { name: true } } },
          });
          if (!participant) return null;
          const { event, course, ...data } = participant;
          return {
            data: { ...data, event: event.name, course: course?.name ?? null },
            label: `${participant.name} — ${event.name}`,
          };
        }
        case 'carousel': {
          const item = await this.prisma.carousel.findUnique({ where: { id: numericId } });
          return item ? { data: item, label: item.name } : null;
        }
        case 'categories': {
          const category = await this.prisma.category.findUnique({ where: { id: numericId } });
          return category ? { data: category, label: category.name } : null;
        }
        case 'courses': {
          const course = await this.prisma.course.findUnique({ where: { id: numericId } });
          return course ? { data: course, label: course.name } : null;
        }
        case 'locations': {
          const location = await this.prisma.location.findUnique({ where: { id: numericId } });
          return location ? { data: location, label: location.name } : null;
        }
        default:
          return null;
      }
    } catch (err: unknown) {
      this.logger.warn(`Could not read ${resource} ${id} for the audit trail: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async findAll(query: FindAuditLogsDto): Promise<AuditLogListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {};

    if (query.outcome) where.outcome = query.outcome;
    if (query.resource) where.resource = query.resource;
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000${BRASILIA_OFFSET}`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999${BRASILIA_OFFSET}`) } : {}),
      };
    }
    if (query.search) {
      // The table collation is case-insensitive, so "contains" already ignores upper and lower case.
      where.OR = [
        { actorName: { contains: query.search } },
        { actorEmail: { contains: query.search } },
        { summary: { contains: query.search } },
        { targetLabel: { contains: query.search } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          actorId: true,
          actorName: true,
          actorEmail: true,
          actorRole: true,
          action: true,
          resource: true,
          summary: true,
          targetId: true,
          targetLabel: true,
          outcome: true,
          statusCode: true,
        },
      }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findOne(id: number): Promise<AuditLogDetailResponseDto> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Registro de auditoria ${id} não encontrado.`);
    return log as AuditLogDetailResponseDto;
  }

  // Keeps the trail for a defined period (LGPD): one year by default, more than the six months the Marco Civil requires for access logs.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpiredLogs(): Promise<void> {
    const limit = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: limit } } });
    if (count) this.logger.log(`Removed ${count} audit logs older than ${this.retentionDays} days`);
  }
}
