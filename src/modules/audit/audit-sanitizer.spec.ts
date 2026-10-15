import { computeChanges, isSensitiveKey, limitJsonSize, PROTECTED_VALUE, sanitizeForAudit } from './audit-sanitizer';

describe('audit sanitizer - Unitary Test', () => {
  describe('isSensitiveKey', () => {
    it.each(['password', 'newPassword', 'presenceSecret', 'refreshToken', 'tokenHash', 'codeHash', 'code', 'csrfToken', 'apiKey'])('should protect %s', key => {
      expect(isSensitiveKey(key)).toBe(true);
    });

    it.each(['name', 'email', 'courseId', 'description', 'imageUrl', 'maxParticipants'])('should keep %s', key => {
      expect(isSensitiveKey(key)).toBe(false);
    });
  });

  describe('sanitizeForAudit', () => {
    it('should mask credentials at any depth and keep the rest', () => {
      const result = sanitizeForAudit({
        email: 'a@fatec.sp.gov.br',
        password: 'Senha@123',
        nested: { code: '123456', presenceSecret: 'segredo', name: 'Evento' },
        list: [{ token: 'abc' }],
      });

      expect(result).toEqual({
        email: 'a@fatec.sp.gov.br',
        password: PROTECTED_VALUE,
        nested: { code: PROTECTED_VALUE, presenceSecret: PROTECTED_VALUE, name: 'Evento' },
        list: [{ token: PROTECTED_VALUE }],
      });
      expect(JSON.stringify(result)).not.toMatch(/Senha@123|123456|segredo|abc/);
    });

    it('should turn dates into ISO strings and files into a short description', () => {
      expect(sanitizeForAudit({ when: new Date('2026-10-15T12:00:00.000Z'), file: Buffer.alloc(10) })).toEqual({
        when: '2026-10-15T12:00:00.000Z',
        file: '[arquivo binário de 10 bytes]',
      });
    });

    it('should cut very long texts', () => {
      const result = sanitizeForAudit({ description: 'a'.repeat(6000) }) as { description: string };
      expect(result.description.length).toBeLessThan(6000);
    });
  });

  describe('limitJsonSize', () => {
    it('should replace values that are too big to store', () => {
      expect(limitJsonSize({ text: 'x'.repeat(100) }, 50)).toEqual({ omitted: expect.stringContaining('KB') });
      expect(limitJsonSize({ text: 'ok' }, 50)).toEqual({ text: 'ok' });
    });
  });

  describe('computeChanges', () => {
    it('should list only the fields that changed', () => {
      const changes = computeChanges(
        { name: 'Antes', maxParticipants: 10, updatedAt: new Date('2026-10-15T10:00:00.000Z') },
        { name: 'Depois', maxParticipants: 10, updatedAt: new Date('2026-10-15T11:00:00.000Z') },
      );

      expect(changes).toEqual([
        { field: 'name', before: 'Antes', after: 'Depois' },
        { field: 'updatedAt', before: '2026-10-15T10:00:00.000Z', after: '2026-10-15T11:00:00.000Z' },
      ]);
    });

    it('should show that a secret changed without revealing it', () => {
      const changes = computeChanges({ presenceSecret: 'velha' }, { presenceSecret: 'nova' });
      expect(changes).toEqual([{ field: 'presenceSecret', before: PROTECTED_VALUE, after: PROTECTED_VALUE, sensitive: true }]);
    });

    it('should return nothing when one side is missing (creation or removal)', () => {
      expect(computeChanges(null, { name: 'x' })).toEqual([]);
      expect(computeChanges({ name: 'x' }, null)).toEqual([]);
    });
  });
});
