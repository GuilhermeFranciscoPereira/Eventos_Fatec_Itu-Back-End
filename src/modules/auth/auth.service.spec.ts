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

describe('AuthService - Unitary Test', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let emailService: any;
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await argon2.hash('pwpepper');
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
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
      send: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Runs the real request flow and returns the signed payload and the code that went by e-mail.
  async function issueCode(purpose: '2fa' | 'reset') {
    prisma.user.findUnique.mockResolvedValue({ id: 1, password: hashedPassword, name: 'N', email: 'e', role: 'ADMIN' });
    jwtService.sign.mockReturnValue('tmpToken');

    if (purpose === '2fa') await service.requestLogin({ email: 'e', password: 'pw' });
    else await service.requestPasswordReset('e');

    const payload = jwtService.sign.mock.calls.at(-1)[0];
    const code = emailService.send.mock.calls.at(-1)[2].match(/>(\d{6})</)[1] as string;
    jwtService.verify.mockReturnValue({ ...payload, exp: Math.floor(Date.now() / 1000) + 15 * 60 });
    return { payload, code };
  }

  function mockSessionCreation() {
    jwtService.sign.mockReturnValue('access');
    (jwtSign as jest.Mock).mockReturnValue('refresh');
    prisma.refreshToken.updateMany.mockResolvedValue(null);
    prisma.refreshToken.create.mockResolvedValue(null);
  }

  describe('requestLogin', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLogin({ email: 'e', password: 'p' })).rejects.toThrow(UnauthorizedException);
    });
    it('should throw UnauthorizedException when password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, password: hashedPassword });
      await expect(service.requestLogin({ email: 'e', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
    it('should return tmp token when credentials valid', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, password: hashedPassword, name: 'N', email: 'e' });
      jwtService.sign.mockReturnValue('tmpToken');
      const result = await service.requestLogin({ email: 'e', password: 'pw' });
      expect(result).toBe('tmpToken');
      expect(emailService.send).toHaveBeenCalledWith('e', 'Autenticação em dois fatores', expect.any(String));
    });
    it('should never put the code inside the token', async () => {
      const { payload, code } = await issueCode('2fa');
      expect(payload).not.toHaveProperty('code');
      expect(JSON.stringify(payload)).not.toContain(code);
      expect(payload).toMatchObject({ sub: 1, purpose: '2fa' });
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens with the e-mailed code', async () => {
      const { code } = await issueCode('2fa');
      mockSessionCreation();
      const result = await service.login(code, 'tmpToken');
      expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });
    it('should reject a wrong code', async () => {
      const { code } = await issueCode('2fa');
      const wrong = code === '000000' ? '111111' : '000000';
      await expect(service.login(wrong, 'tmpToken')).rejects.toThrow('Código 2FA inválido');
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
      mockSessionCreation();
      await service.login(code, 'tmpToken');
      await expect(service.login(code, 'tmpToken')).rejects.toThrow('Este código já foi utilizado. Solicite um novo código.');
    });
    it('should block the token after 5 wrong attempts', async () => {
      const { code } = await issueCode('2fa');
      const wrong = code === '000000' ? '111111' : '000000';
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(service.login(wrong, 'tmpToken')).rejects.toThrow('Código 2FA inválido');
      }
      await expect(service.login(code, 'tmpToken')).rejects.toThrow('Muitas tentativas inválidas. Solicite um novo código.');
    });
    it('should answer 401 instead of crashing when the token is expired', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.login('123456', 'tmpToken')).rejects.toThrow('Código expirado. Solicite um novo código.');
    });
  });

  describe('requestPasswordReset', () => {
    it('should throw UnauthorizedException when email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestPasswordReset('e')).rejects.toThrow(UnauthorizedException);
    });
    it('should return tmp token when email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'N', email: 'e' });
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
      const wrong = code === '000000' ? '111111' : '000000';
      await expect(service.passwordReset(wrong, 'new', 'tmpToken')).rejects.toThrow('Código inválido');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
    it('should not accept a 2FA token', async () => {
      const { code } = await issueCode('2fa');
      await expect(service.passwordReset(code, 'new', 'tmpToken')).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
    it('should update the password with the e-mailed code only once', async () => {
      const { code } = await issueCode('reset');
      jest.spyOn(argon2, 'hash').mockResolvedValue('h' as never);
      prisma.user.update.mockResolvedValue(null);
      await expect(service.passwordReset(code, 'p', 'tmpToken')).resolves.toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { password: 'h' } });
      await expect(service.passwordReset(code, 'p', 'tmpToken')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return the user when access token valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, name: 'N', email: 'e', role: 'ADMIN', exp: 10, iat: 5 });
      (jwtVerify as jest.Mock).mockReturnValue({ exp: 20, iat: 10 });
      prisma.user.findUnique.mockResolvedValue({ name: 'N', email: 'e', imageUrl: null });
      const req = { cookies: { access_token: 'a', refresh_token: 'r' } };
      await expect(service.getMe(req as any)).resolves.toEqual({
        sub: 1,
        name: 'N',
        imageUrl: null,
        email: 'e',
        role: 'ADMIN',
        exp: 10,
        iat: 5,
      });
    });
    it('should throw UnauthorizedException when token invalid', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error(); });
      await expect(service.getMe({ cookies: {} } as any)).rejects.toThrow(UnauthorizedException);
    });
    it('should not accept a 2FA token as a session', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, purpose: '2fa', jti: 'j', codeHash: 'h', exp: 10, iat: 5 });
      await expect(service.getMe({ cookies: { access_token: 'a' } } as any)).rejects.toThrow(UnauthorizedException);
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
