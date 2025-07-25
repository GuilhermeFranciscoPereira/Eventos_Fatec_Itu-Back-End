import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

type MockResponse = Partial<Response> & {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;
  let moduleRef: TestingModule;
  let req: any;
  let res: MockResponse;

  beforeEach(async () => {
    const authServiceMock = {
      getMe: jest.fn(),
      refreshTokens: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestLogin: jest.fn(),
      login: jest.fn(),
      requestPasswordReset: jest.fn(),
      passwordReset: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = moduleRef.get(AuthController);
    service = moduleRef.get(AuthService) as jest.Mocked<AuthService>;

    req = { cookies: {}, user: { userId: 1 } };
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as MockResponse;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('me', () => {
    it('should return user data if token valid', async () => {
      const meDto = { sub: 1, email: 'a@b.com', name: 'Test', role: 'ADMIN', exp: 0, iat: 0 };
      service.getMe.mockReturnValue(meDto as any);
      req.cookies = { access_token: 'valid' };

      const result = await controller.me(req, res as Response);
      expect(result).toBe(meDto);
      expect(service.getMe).toHaveBeenCalledWith(req);
    });

    it('should refresh tokens and retry if expired', async () => {
      const error = new Error('Token expirado');
      service.getMe.mockImplementationOnce(() => { throw error; });
      req.cookies = { access_token: 'old', refresh_token: 'r' };
      service.refreshTokens.mockResolvedValue({ accessToken: 'newA', refreshToken: 'newR' });
      service.getMe.mockReturnValue({ sub: 1 } as any);

      const result = await controller.me(req, res as Response);
      expect(service.refreshTokens).toHaveBeenCalledWith('r');
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'newA',
        expect.objectContaining({ maxAge: 15 * 60 * 1000, path: '/' })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'newR',
        expect.objectContaining({ maxAge: 24 * 60 * 60 * 1000, path: '/' })
      );
      expect(result).toEqual({ sub: 1 });
    });

    it('should throw if non-refreshable error', async () => {
      const error = new Error('Outro erro');
      service.getMe.mockImplementation(() => { throw error; });
      await expect(controller.me(req, res as Response)).rejects.toThrow(error);
    });
  });

  describe('register', () => {
    it('should call authService.register and return its result', async () => {
      const dto = { email: 'a@b.com', password: 'P@ssw0rd!', role: 'ADMIN', name: 'Teste' };
      service.register.mockResolvedValue({ id: 1, email: dto.email });
      await expect(controller.register(dto as any)).resolves.toEqual({ id: 1, email: dto.email });
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('should clear cookies and return message', async () => {
      const result = await controller.logout(req, res as Response);
      expect(service.logout).toHaveBeenCalledWith(req.user.userId);
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/', domain: process.env.COOKIE_DOMAIN, sameSite: 'lax' });
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/', domain: process.env.COOKIE_DOMAIN, sameSite: 'lax' });
      expect(result).toEqual({ message: 'Deslogado com sucesso!' });
    });
  });

  describe('requestLogin', () => {
    it('should set 2fa_token cookie and return requires2FA', async () => {
      service.requestLogin.mockResolvedValue('tmp');
      const dto = { email: 'a@b.com', password: 'P@ssw0rd!' };
      const result = await controller.requestLogin(dto as any, res as Response);
      expect(service.requestLogin).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        '2fa_token',
        'tmp',
        expect.objectContaining({ maxAge: 15 * 60 * 1000, path: '/auth' })
      );
      expect(result).toEqual({ requires2FA: true });
    });
  });

  describe('login', () => {
    it('should throw if no 2fa_token', async () => {
      req.cookies = {};
      await expect(controller.login({ code: '123456' } as any, req, res as Response))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should clear 2fa cookie, set tokens and return message', async () => {
      req.cookies = { '2fa_token': 'tmp' };
      service.login.mockResolvedValue({ accessToken: 'A', refreshToken: 'R' });
      const result = await controller.login({ code: '123456' } as any, req, res as Response);
      expect(res.clearCookie).toHaveBeenCalledWith('2fa_token', { path: '/auth' });
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'A',
        expect.objectContaining({ maxAge: 15 * 60 * 1000, path: '/' })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'R',
        expect.objectContaining({ maxAge: 24 * 60 * 60 * 1000, path: '/' })
      );
      expect(result).toEqual({ message: 'Autenticado com 2FA' });
    });
  });

  describe('requestPasswordReset', () => {
    it('should set reset_token cookie and return message', async () => {
      service.requestPasswordReset.mockResolvedValue('tmp');
      const dto = { email: 'a@b.com' };
      const result = await controller.requestPasswordReset(dto as any, res as Response);
      expect(service.requestPasswordReset).toHaveBeenCalledWith(dto.email);
      expect(res.cookie).toHaveBeenCalledWith(
        'reset_token',
        'tmp',
        expect.objectContaining({ maxAge: 15 * 60 * 1000, path: '/auth' })
      );
      expect(result).toEqual({ message: 'O código foi enviado por e-mail' });
    });
  });

  describe('passwordReset', () => {
    it('should throw if no reset_token', async () => {
      req.cookies = {};
      await expect(controller.passwordReset({ code: '123', newPassword: 'P@ssw0rd!' } as any, req, res as Response))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should clear reset cookie and return message on success', async () => {
      req.cookies = { 'reset_token': 'tmp' };
      service.passwordReset.mockResolvedValue(true);
      const result = await controller.passwordReset({ code: '123', newPassword: 'P@ssw0rd!' } as any, req, res as Response);
      expect(res.clearCookie).toHaveBeenCalledWith('reset_token', { path: '/auth' });
      expect(result).toEqual({ message: 'Senha redefinida com sucesso' });
    });
  });
});
