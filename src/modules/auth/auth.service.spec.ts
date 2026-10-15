import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';

jest.mock('jsonwebtoken');

type AuthCodeRow = {
  id: string;
  userId: number | null;
  purpose: string;
  codeHash: string;
  failures: number;
  usedAt: Date | null;
  expiresAt: Date;
};

// In-memory stand-in for the AuthCode table, shared by every service instance like the real database.
function createAuthCodeTable() {
  const rows = new Map<string, AuthCodeRow>();
  const matches = (row: AuthCodeRow, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => (row as Record<string, unknown>)[key] === value);

  return {
    rows,
    create: jest.fn(async ({ data }) => {
      const row: AuthCodeRow = { failures: 0, usedAt: null, ...data };
      rows.set(row.id, row);
      return { ...row };
    }),
    findUnique: jest.fn(async ({ where }) => (rows.has(where.id) ? { ...rows.get(where.id) } : null)),
    update: jest.fn(async ({ where, data }) => {
      const row = rows.get(where.id)!;
      if (data.failures?.increment) row.failures += data.failures.increment;
      return { ...row };
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      const row = rows.get(where.id);
      if (!row || row.usedAt !== null || row.failures >= where.failures.lt) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }),
    deleteMany: jest.fn(async ({ where }) => {
      let count = 0;
      for (const [id, row] of rows) {
        if (matches(row, where)) {
          rows.delete(id);
          count++;
        }
      }
      return { count };
    }),
  };
}

describe('AuthService - Unitary Test', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let emailService: any;
  let hashedPassword: string;

  const baseUser = { id: 1, name: 'N', email: 'e', role: 'ADMIN', sessionVersion: 0, imageUrl: null };

  beforeAll(async () => {
    hashedPassword = await argon2.hash('pwpepper');
  });

  async function buildService(): Promise<AuthService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    return module.get<AuthService>(AuthService);
  }

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
      },
      authCode: createAuthCodeTable(),
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn().mockImplementation(key => ({
        PASSWORD_PEPPER: 'pepper',
        TOKEN_HASH_SECRET: 'hashSecret',
        JWT_REFRESH_SECRET: 'refreshSecret',
        ACCESS_COOKIE_NAME: 'access_token',
        REFRESH_COOKIE_NAME: 'refresh_token',
      }[key])),
    };
    emailService = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    service = await buildService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Runs the real request flow and returns the signed payload and the code that went by e-mail.
  async function issueCode(purpose: '2fa' | 'reset') {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, password: hashedPassword });
    jwtService.sign.mockReturnValue('tmpToken');

    if (purpose === '2fa') await service.requestLogin({ email: 'e', password: 'pw' });
    else await service.requestPasswordReset('e');

    const payload = jwtService.sign.mock.calls.at(-1)[0];
    const code = emailService.send.mock.calls.at(-1)[2].match(/>(\d{6})</)[1] as string;
    jwtService.verify.mockReturnValue({ ...payload, exp: Math.floor(Date.now() / 1000) + 15 * 60 });
    return { payload, code };
  }

  function wrongCodeFor(code: string): string {
    return code === '000000' ? '111111' : '000000';
  }

  describe('requestLogin', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLogin({ email: 'e', password: 'p' })).rejects.toThrow(UnauthorizedException);
    });
    it('should throw UnauthorizedException when password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password: hashedPassword });
      await expect(service.requestLogin({ email: 'e', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
    it('should return tmp token when credentials valid', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password: hashedPassword });
      jwtService.sign.mockReturnValue('tmpToken');
      const result = await service.requestLogin({ email: 'e', password: 'pw' });
      expect(result).toBe('tmpToken');
      expect(emailService.send).toHaveBeenCalledWith('e', 'Autenticação em dois fatores', expect.any(String));
    });
    it('should not crash when the e-mail cannot be sent', async () => {
      emailService.send.mockRejectedValue(new Error('smtp down'));
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password: hashedPassword });
      jwtService.sign.mockReturnValue('tmpToken');
      await expect(service.requestLogin({ email: 'e', password: 'pw' })).resolves.toBe('tmpToken');
    });
    it('should never put the code inside the token or the database', async () => {
      const { payload, code } = await issueCode('2fa');
      expect(payload).not.toHaveProperty('code');
      expect(JSON.stringify(payload)).not.toContain(code);
      expect(payload).toMatchObject({ sub: 1, purpose: '2fa' });
      const [row] = [...prisma.authCode.rows.values()];
      expect(row).toMatchObject({ id: payload.jti, userId: 1, purpose: 'TWO_FACTOR' });
      expect(JSON.stringify(row)).not.toContain(`"${code}"`);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens with the e-mailed code', async () => {
      const { code } = await issueCode('2fa');
      jwtService.sign.mockReturnValue('access');
      (jwtSign as jest.Mock).mockReturnValue('refresh');
      const result = await service.login(code, 'tmpToken');
      expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
      expect(jwtService.sign).toHaveBeenLastCalledWith(expect.objectContaining({ sub: 1, role: 'ADMIN', sv: 0 }), { expiresIn: '15m' });
    });
    it('should reject a wrong code', async () => {
      const { code } = await issueCode('2fa');
      await expect(service.login(wrongCodeFor(code), 'tmpToken')).rejects.toThrow('Código 2FA inválido');
    });
    it('should not accept fixed bypass codes', async () => {
      const { code } = await issueCode('2fa');
      for (const bypass of ['248574', '194837'].filter(value => value !== code)) {
        await expect(service.login(bypass, 'tmpToken')).rejects.toThrow(UnauthorizedException);
      }
    });
    it('should not accept a password reset token', async () => {
      const { code } = await issueCode('reset');
      await expect(service.login(code, 'tmpToken')).rejects.toThrow(UnauthorizedException);
    });
    it('should accept each code only once', async () => {
      const { code } = await issueCode('2fa');
      await service.login(code, 'tmpToken');
      await expect(service.login(code, 'tmpToken')).rejects.toThrow('Este código já foi utilizado. Solicite um novo código.');
    });
    it('should keep a used code invalid after an API restart', async () => {
      const { code } = await issueCode('2fa');
      await service.login(code, 'tmpToken');
      const restarted = await buildService();
      await expect(restarted.login(code, 'tmpToken')).rejects.toThrow('Este código já foi utilizado. Solicite um novo código.');
    });
    it('should cancel the previous code when a new one is requested', async () => {
      const first = await issueCode('2fa');
      const firstPayload = { ...first.payload, exp: Math.floor(Date.now() / 1000) + 900 };
      await issueCode('2fa');
      jwtService.verify.mockReturnValue(firstPayload);
      await expect(service.login(first.code, 'tmpToken')).rejects.toThrow('Código expirado. Solicite um novo código.');
    });
    it('should block the token after 5 wrong attempts', async () => {
      const { code } = await issueCode('2fa');
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(service.login(wrongCodeFor(code), 'tmpToken')).rejects.toThrow('Código 2FA inválido');
      }
      await expect(service.login(code, 'tmpToken')).rejects.toThrow('Muitas tentativas inválidas. Solicite um novo código.');
    });
    it('should refuse a code past its expiration date', async () => {
      const { payload, code } = await issueCode('2fa');
      prisma.authCode.rows.get(payload.jti)!.expiresAt = new Date(Date.now() - 1000);
      await expect(service.login(code, 'tmpToken')).rejects.toThrow('Código expirado. Solicite um novo código.');
    });
    it('should answer 401 instead of crashing when the token is expired', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.login('123456', 'tmpToken')).rejects.toThrow('Código expirado. Solicite um novo código.');
    });
  });

  describe('requestPasswordReset', () => {
    it('should answer an unknown e-mail like a known one, without sending anything', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      jwtService.sign.mockReturnValue('tmpReset');
      await expect(service.requestPasswordReset('ghost@fatec.sp.gov.br')).resolves.toBe('tmpReset');
      expect(emailService.send).not.toHaveBeenCalled();
      const [row] = [...prisma.authCode.rows.values()];
      expect(row).toMatchObject({ userId: null, purpose: 'PASSWORD_RESET' });
    });
    it('should never accept a code for an unknown e-mail', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      jwtService.sign.mockReturnValue('tmpReset');
      await service.requestPasswordReset('ghost@fatec.sp.gov.br');
      jwtService.verify.mockReturnValue({ ...jwtService.sign.mock.calls.at(-1)[0], exp: Math.floor(Date.now() / 1000) + 900 });
      await expect(service.passwordReset('123456', 'New@1234', 'tmpReset')).rejects.toThrow('Código inválido');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
    it('should return tmp token and send the code when email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser });
      jwtService.sign.mockReturnValue('tmpReset');
      const result = await service.requestPasswordReset('e');
      expect(result).toBe('tmpReset');
      expect(emailService.send).toHaveBeenCalledWith('e', 'Redefinição de senha', expect.any(String));
    });
    it('should never put the code inside the token', async () => {
      const { payload, code } = await issueCode('reset');
      expect(payload).not.toHaveProperty('code');
      expect(JSON.stringify(payload)).not.toContain(code);
    });
  });

  describe('passwordReset', () => {
    it('should reject a wrong code', async () => {
      const { code } = await issueCode('reset');
      await expect(service.passwordReset(wrongCodeFor(code), 'new', 'tmpToken')).rejects.toThrow('Código inválido');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
    it('should not accept a 2FA token', async () => {
      const { code } = await issueCode('2fa');
      await expect(service.passwordReset(code, 'new', 'tmpToken')).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
    it('should change the password once and end every session of the account', async () => {
      const { code } = await issueCode('reset');
      jest.spyOn(argon2, 'hash').mockResolvedValue('h' as never);
      prisma.user.update.mockResolvedValue({ ...baseUser, sessionVersion: 1 });
      await expect(service.passwordReset(code, 'p', 'tmpToken')).resolves.toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { password: 'h', sessionVersion: { increment: 1 } } });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 1, isRevoked: false }, data: { isRevoked: true } });
      await expect(service.passwordReset(code, 'p', 'tmpToken')).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMe', () => {
    it('should return the role saved in the database, not the one in the token', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, name: 'N', email: 'e', role: 'ADMIN', sv: 0, exp: 10, iat: 5 });
      prisma.user.findUnique.mockResolvedValue({ name: 'N', email: 'e', imageUrl: null, role: 'COORDENADOR', sessionVersion: 0 });
      const req = { cookies: { access_token: 'a', refresh_token: 'r' } };
      await expect(service.getMe(req as any)).resolves.toEqual({
        sub: 1,
        name: 'N',
        imageUrl: null,
        email: 'e',
        role: 'COORDENADOR',
        exp: 10,
        iat: 5,
      });
    });
    it('should refuse a token issued before a password or role change', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, role: 'ADMIN', sv: 0, exp: 10, iat: 5 });
      prisma.user.findUnique.mockResolvedValue({ name: 'N', email: 'e', imageUrl: null, role: 'ADMIN', sessionVersion: 1 });
      await expect(service.getMe({ cookies: { access_token: 'a' } } as any)).rejects.toThrow(UnauthorizedException);
    });
    it('should throw UnauthorizedException when token invalid', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error(); });
      await expect(service.getMe({ cookies: {} } as any)).rejects.toThrow(UnauthorizedException);
    });
    it('should not accept a 2FA token as a session', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, purpose: '2fa', jti: 'j', exp: 10, iat: 5 });
      await expect(service.getMe({ cookies: { access_token: 'a' } } as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 9 });
      jwtService.sign.mockReturnValue('access');
      (jwtSign as jest.Mock).mockReturnValue('refresh');
    });

    it('should build the new session from the database, so a demoted user loses the old role', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1, name: 'N', email: 'e', role: 'ADMIN', sv: 2 });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, role: 'AUXILIAR', sessionVersion: 2 });
      await expect(service.refreshTokens('old')).resolves.toEqual({ accessToken: 'access', refreshToken: 'refresh' });
      expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({ role: 'AUXILIAR', sv: 2 }), { expiresIn: '15m' });
    });
    it('should end the session when the password or role changed after the token was issued', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1, role: 'ADMIN', sv: 0 });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, sessionVersion: 1 });
      await expect(service.refreshTokens('old')).rejects.toThrow('Sessão expirada. Faça login novamente.');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { id: 9 }, data: { isRevoked: true } });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
    it('should accept tokens issued before sessionVersion existed while nothing changed', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1, role: 'ADMIN' });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, sessionVersion: 0 });
      await expect(service.refreshTokens('old')).resolves.toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });
    it('should refuse a revoked refresh token', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1, role: 'ADMIN', sv: 0 });
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refreshTokens('old')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke tokens for user', async () => {
      await service.logout(1);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
