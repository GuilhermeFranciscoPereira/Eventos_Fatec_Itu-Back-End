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

  describe('requestLogin', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLogin({ email: 'e', password: 'p' })).rejects.toThrow(UnauthorizedException);
    });
    it('should throw UnauthorizedException when password invalid', async () => {
      const hashed = await argon2.hash('pwpepper');
      prisma.user.findUnique.mockResolvedValue({ id: 1, password: hashed });
      await expect(service.requestLogin({ email: 'e', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
    it('should return tmp token when credentials valid', async () => {
      const hashed = await argon2.hash('pwpepper');
      prisma.user.findUnique.mockResolvedValue({ id: 1, password: hashed, name: 'N', email: 'e' });
      jwtService.sign.mockReturnValue('tmpToken');
      const result = await service.requestLogin({ email: 'e', password: 'pw' });
      expect(result).toBe('tmpToken');
      expect(emailService.send).toHaveBeenCalledWith('e', 'Seu código de autenticação em dois fatores', expect.any(String));
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when tmpToken invalid', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, code: '123' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('123', 'tmp')).rejects.toThrow(UnauthorizedException);
    });
    it('should return access and refresh tokens on success', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, code: '123' });
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'N', email: 'e', role: 'ADMIN' });
      jwtService.sign.mockReturnValue('access');
      (jwtSign as jest.Mock).mockReturnValue('refresh');
      prisma.refreshToken.updateMany.mockResolvedValue(null);
      prisma.refreshToken.create.mockResolvedValue(null);
      const result = await service.login('123', 'tmp');
      expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
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
      expect(emailService.send).toHaveBeenCalledWith('e', 'Seu código de redefinição de senha', expect.any(String));
    });
  });

  describe('passwordReset', () => {
    it('should throw UnauthorizedException when code mismatch', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, code: '123' });
      await expect(service.passwordReset('000', 'new', 'tmp')).rejects.toThrow(UnauthorizedException);
    });
    it('should return true when reset successful', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, code: '123' });
      jest.spyOn(argon2, 'hash').mockResolvedValue('h');
      prisma.user.update = jest.fn().mockResolvedValue(null);
      const result = await service.passwordReset('123', 'p', 'tmp');
      expect(result).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should return payload when access token valid', () => {
      jwtService.verify.mockReturnValue({ sub: 1, name: 'N', email: 'e', role: 'ADMIN', exp: 10, iat: 5 });
      (jwtVerify as jest.Mock).mockReturnValue({ exp: 20, iat: 10 });
      const req = { cookies: { access_token: 'a', refresh_token: 'r' } };
      const result = service.getMe(req as any);
      expect(result).toEqual({
        sub: 1,
        name: 'N',
        email: 'e',
        role: 'ADMIN',
        exp: 10,
        iat: 5,
        refreshToken: 'r',
        refreshTokenExp: 20,
        refreshTokenIat: 10,
      });
    });
    it('should throw UnauthorizedException when token invalid', () => {
      jwtService.verify.mockImplementation(() => { throw new Error(); });
      expect(() => service.getMe({ cookies: {} } as any)).toThrow(UnauthorizedException);
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
