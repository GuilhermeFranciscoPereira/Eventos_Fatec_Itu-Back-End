export const PROTECTED_VALUE = '[PROTEGIDO]';

// Passwords, codes, tokens, hashes and secrets (including the event presence word) never reach the audit trail.
const SENSITIVE_KEY = /pass(word)?|secret|token|hash|csrf|cookie|authorization|api[-_]?key|^code$/i;

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 200;
const MAX_STRING_LENGTH = 5000;
export const MAX_JSON_BYTES = 60_000;

export type AuditChange = {
  field: string;
  before: unknown;
  after: unknown;
  sensitive?: boolean;
};

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

// Deep copy safe to store as JSON: sensitive keys masked, dates as ISO strings, files and huge values cut down.
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Buffer.isBuffer(value)) return `[arquivo binário de ${value.length} bytes]`;
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return null;
  if (depth >= MAX_DEPTH) return '[conteúdo omitido]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeForAudit(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item === undefined || typeof item === 'function') continue;
    result[key] = isSensitiveKey(key) ? PROTECTED_VALUE : sanitizeForAudit(item, depth + 1);
  }
  return result;
}

// Keeps a single record from growing the table without limit (a long description, a big list).
export function limitJsonSize(value: unknown, maxBytes = MAX_JSON_BYTES): unknown {
  if (value === null || value === undefined) return null;
  const bytes = Buffer.byteLength(JSON.stringify(value));
  if (bytes <= maxBytes) return value;
  return { omitted: `Conteúdo com ${Math.ceil(bytes / 1024)} KB não foi armazenado por ser muito grande.` };
}

function comparable(value: unknown): string {
  return JSON.stringify(sanitizeForAudit(value) ?? null);
}

// Field-by-field difference between two snapshots. A sensitive field only shows that it changed, never its values.
export function computeChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null): AuditChange[] {
  if (!before || !after) return [];

  const changes: AuditChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const previous = before[key];
    const next = after[key];

    if (isSensitiveKey(key)) {
      if ((previous ?? null) !== (next ?? null)) {
        changes.push({ field: key, before: PROTECTED_VALUE, after: PROTECTED_VALUE, sensitive: true });
      }
      continue;
    }

    if (comparable(previous) !== comparable(next)) {
      changes.push({ field: key, before: sanitizeForAudit(previous), after: sanitizeForAudit(next) });
    }
  }

  return changes;
}
