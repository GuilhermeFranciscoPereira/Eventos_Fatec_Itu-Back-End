import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';

jest.mock('argon2');
jest.mock('crypto', () => ({
  randomInt: jest.fn(),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('token-hash'),
  })),
}));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(), verify: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let moduleRef: TestingModule;
  let prisma: any;
  let jwtService: any;
  let config: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: { updateMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn()
    };
    jwtService = { sign: jest.fn(), verify: jest.fn() };
    config = { getOrThrow: jest.fn((key: string) => key + '_val') };
    emailService = { send: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('logout', () => {
    it('should revoke all tokens', async () => {
      await service.logout(1);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('requestLogin', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLogin({ email: 'e', password: 'p' })).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it('should throw if password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, password: 'h', email: 'e', name: 'n', role: 'USER' });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(service.requestLogin({ email: 'e', password: 'p' })).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it('should generate tmp token, send email and return token', async () => {
      const userMock = { id: 1, password: 'h', email: 'e', name: 'n', role: 'USER' };
      prisma.user.findUnique.mockResolvedValue(userMock);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('tmp');
      (randomInt as jest.Mock).mockReturnValue(123456);

      const result = await service.requestLogin({ email: 'e', password: 'p' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, code: '123456' }),
        expect.objectContaining({ expiresIn: '15m' })
      );
      expect(emailService.send).toHaveBeenCalledWith('e', expect.any(String), expect.stringContaining('123456'));
      expect(result).toBe('tmp');
    });
  });

  describe('login', () => {
    it('should throw if 2fa code invalid', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1, code: '000000' });
      await expect(service.login('123456', 'tk')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1, code: '123' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('123', 'tk')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should sign tokens, revoke old, store new and return', async () => {
      const payload = { sub: 1, code: '123' };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'n', email: 'e', role: 'USER' });
      jwtService.sign.mockReturnValue('A');
      (jwtSign as jest.Mock).mockReturnValue('R');

      const result = await service.login('123', 'tk');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tokenHash: 'token-hash' }) })
      );
      expect(result).toEqual({ accessToken: 'A', refreshToken: 'R' });
    });
  });

  describe('requestPasswordReset', () => {
    it('should throw if email not exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestPasswordReset('e')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should sign tmp token, send email and return', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'n', email: 'e' });
      (randomInt as jest.Mock).mockReturnValue(654321);
      jwtService.sign.mockReturnValue('tmp');

      const result = await service.requestPasswordReset('e');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, code: '654321' }),
        expect.objectContaining({ expiresIn: '15m' })
      );
      expect(emailService.send).toHaveBeenCalled();
      expect(result).toBe('tmp');
    });
  });

  describe('passwordReset', () => {
    it('should throw if code mismatch', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1, code: '000' });
      await expect(service.passwordReset('123', 'new', 'tk')).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it('should hash new password and update user', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1, code: '123' });
      (argon2.hash as jest.Mock).mockResolvedValue('h2');
      prisma.user.update.mockResolvedValue({});
      const result = await service.passwordReset('123', 'new', 'tk');
      expect(argon2.hash).toHaveBeenCalledWith('new' + service['pepper'], expect.any(Object));
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { password: 'h2' } });
      expect(result).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should throw if token invalid', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => { throw new Error(); });
      expect(() => service.getMe({ cookies: {} } as any)).toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should throw if verify fails', async () => {
      (jwtVerify as jest.Mock).mockImplementation(() => { throw new Error(); });
      await expect(service.refreshTokens('old')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if no stored token', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1 });
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refreshTokens('old')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should revoke old, create new, and return tokens', async () => {
      (jwtVerify as jest.Mock).mockReturnValue({ sub: 1, name: 'n', email: 'e', role: 'USER' });
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 5 });
      jwtService.sign.mockReturnValue('A');
      (jwtSign as jest.Mock).mockReturnValue('R');

      const result = await service.refreshTokens('old');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'A', refreshToken: 'R' });
    });
  });
});
