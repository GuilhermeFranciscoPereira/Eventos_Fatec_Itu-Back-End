import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-auth.dto';
import { MeResponseDto } from './dto/me-auth.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RequestLoginDto } from './dto/request-login-auth.dto';
import { ResetPasswordDto } from './dto/reset-password-auth.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password-auth.dto';
import { Controller, Post, Get, Body, Req, Res, HttpCode, UseGuards, UnauthorizedException } from '@nestjs/common';

function setCookie(res: Response, name: string, value: string, maxAge: number): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
    secure: process.env.NODE_ENV === 'production', //Exige https em prod
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
    maxAge
  });
}

const ACCESS_COOKIE = process.env.ACCESS_COOKIE_NAME || '';
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || '';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Get('me')
  @HttpCode(200)
  async me(@Req() req: any & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response): Promise<MeResponseDto> {
    try {
      return await this.authService.getMe(req) as unknown as Promise<MeResponseDto>;
    } catch (err: any) {
      if (err.message.includes('expirado') && req.cookies[REFRESH_COOKIE]) {
        const { accessToken, refreshToken } = await this.authService.refreshTokens(req.cookies[REFRESH_COOKIE]);
        setCookie(res, ACCESS_COOKIE, accessToken, 15 * 60 * 1000); // 15 Minutes
        setCookie(res, REFRESH_COOKIE, refreshToken, 3 * 24 * 60 * 60 * 1000); // 3 Days
        req.cookies[ACCESS_COOKIE] = accessToken;
        req.cookies[REFRESH_COOKIE] = refreshToken;
        return await this.authService.getMe(req) as unknown as Promise<MeResponseDto>;
      }
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any & { user: { userId: number } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    res.clearCookie(ACCESS_COOKIE, { path: '/', domain: process.env.COOKIE_DOMAIN, sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const) });
    res.clearCookie(REFRESH_COOKIE, { path: '/', domain: process.env.COOKIE_DOMAIN, sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const) });
    return { message: 'Deslogado com sucesso!' };
  }

  @Post('request-login')
  @HttpCode(200)
  async requestLogin(@Body() dto: RequestLoginDto, @Res({ passthrough: true }) res: Response) {
    const tmpToken = await this.authService.requestLogin(dto);
    setCookie(res, '2fa_token', tmpToken, 15 * 60 * 1000);
    return { requires2FA: true };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response) {
    const tmpToken = req.cookies['2fa_token']; if (!tmpToken) throw new UnauthorizedException('Token expirado, solicite novamente!');
    const { accessToken, refreshToken } = await this.authService.login(dto.code, tmpToken);
    if (accessToken) res.clearCookie('2fa_token', { path: '/auth' });
    setCookie(res, ACCESS_COOKIE, accessToken, 15 * 60 * 1000); // 15 Minutes
    setCookie(res, REFRESH_COOKIE, refreshToken, 3 * 24 * 60 * 60 * 1000); // 3 Days
    return { message: 'Autenticado com 2FA' };
  }

  @Post('request-reset-password')
  @HttpCode(200)
  async requestPasswordReset(@Body() dto: RequestResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const tmpToken = await this.authService.requestPasswordReset(dto.email);
    setCookie(res, 'reset_token', tmpToken, 15 * 60 * 1000);
    return { message: 'O código foi enviado por e-mail' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async passwordReset(@Body() dto: ResetPasswordDto, @Req() req: Request & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response) {
    const tmpToken = req.cookies['reset_token']; if (!tmpToken) throw new UnauthorizedException('Token expirado, solicite novamente!');
    const result = await this.authService.passwordReset(dto.code, dto.newPassword, tmpToken);
    if (result) res.clearCookie('reset_token', { path: '/auth' });
    return { message: 'Senha redefinida com sucesso' };
  }
}
