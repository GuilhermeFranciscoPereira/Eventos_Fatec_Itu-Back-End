import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController - Unitary Test', () => {
  let controller: AuthController;
  let service: any;
  let req: any;
  let res: any;

  beforeEach(async () => {
    service = {
      getMe: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      requestLogin: jest.fn(),
      login: jest.fn(),
      requestPasswordReset: jest.fn(),
      passwordReset: jest.fn(),
    };
    req = { cookies: {} };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  describe('me', () => {
    it('should return me data when valid', async () => {
      service.getMe.mockReturnValue({ sub: 1 });
      const result = await controller.me(req, res);
      expect(result).toEqual({ sub: 1 });
    });

    it('should refresh tokens when expired', async () => {
      service.getMe.mockImplementationOnce(() => { throw new Error('expirado'); });
      service.refreshTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });
      service.getMe.mockReturnValueOnce({ sub: 2 });
      req.cookies = { refresh_token: 'r' };
      const result = await controller.me(req, res);
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'a', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'b', expect.any(Object));
      expect(result).toEqual({ sub: 2 });
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      req.user = { userId: 3 };
      const result = await controller.logout(req, res);
      expect(service.logout).toHaveBeenCalledWith(3);
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(result).toEqual({ message: 'Deslogado com sucesso!' });
    });
  });

  describe('requestLogin', () => {
    it('should set 2fa token cookie and return requires2FA', async () => {
      service.requestLogin.mockResolvedValue('tmp');
      const dto = { email: 'e', password: 'p' };
      const result = await controller.requestLogin(dto, res);
      expect(res.cookie).toHaveBeenCalledWith('2fa_token', 'tmp', expect.any(Object));
      expect(result).toEqual({ requires2FA: true });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when tmpToken missing', async () => {
      await expect(controller.login({ code: 'c' }, req, res)).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate and set cookies', async () => {
      req.cookies = { '2fa_token': 'tmp' };
      service.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });
      const dto = { code: 'c' };
      const result = await controller.login(dto, req, res);
      expect(res.clearCookie).toHaveBeenCalledWith('2fa_token', { path: '/auth' });
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'a', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'b', expect.any(Object));
      expect(result).toEqual({ message: 'Autenticado com 2FA' });
    });
  });

  describe('requestPasswordReset', () => {
    it('should set reset_token cookie and return message', async () => {
      service.requestPasswordReset.mockResolvedValue('t');
      const dto = { email: 'e' };
      const result = await controller.requestPasswordReset(dto, res);
      expect(res.cookie).toHaveBeenCalledWith('reset_token', 't', expect.any(Object));
      expect(result).toEqual({ message: 'O código foi enviado por e-mail' });
    });
  });

  describe('passwordReset', () => {
    it('should throw UnauthorizedException when tmpToken missing', async () => {
      const dto = { code: 'c', newPassword: 'p' };
      await expect(controller.passwordReset(dto, req, res)).rejects.toThrow(UnauthorizedException);
    });

    it('should reset password and clear cookie', async () => {
      req.cookies = { reset_token: 't' };
      service.passwordReset.mockResolvedValue(true);
      const dto = { code: 'c', newPassword: 'p' };
      const result = await controller.passwordReset(dto, req, res);
      expect(res.clearCookie).toHaveBeenCalledWith('reset_token', { path: '/auth' });
      expect(result).toEqual({ message: 'Senha redefinida com sucesso' });
    });
  });
});
