import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login-auth.dto';
import { MeResponseDto } from './dto/me-auth.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RequestLoginDto } from './dto/request-login-auth.dto';
import { ResetPasswordDto } from './dto/reset-password-auth.dto';
import { Audit, SkipAudit } from '../../decorators/audit.decorator';
import { RequestResetPasswordDto } from './dto/request-reset-password-auth.dto';
import { Controller, Post, Get, Body, Req, Res, HttpCode, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

const TWO_FACTOR_COOKIE = '2fa_token';
const RESET_COOKIE = 'reset_token';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const CODE_TTL_MS = 15 * 60 * 1000;

export const RESET_REQUEST_MESSAGE = 'Se o e-mail informado estiver cadastrado, você receberá um código para redefinir a senha em instantes.';

// Read on every call so the names in the environment always win (and tests do not depend on import order).
const accessCookieName = (): string => process.env.ACCESS_COOKIE_NAME || 'access_token';
const refreshCookieName = (): string => process.env.REFRESH_COOKIE_NAME || 'refresh_token';

// Creating and clearing use the same options: a browser only removes a cookie whose path and domain match.
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
    secure: process.env.NODE_ENV === 'production', //Exige https em prod
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
  };
}

function setCookie(res: Response, name: string, value: string, maxAge: number): void {
  res.cookie(name, value, { ...cookieOptions(), maxAge });
}

function clearCookie(res: Response, name: string): void {
  res.clearCookie(name, cookieOptions());
}

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Get('me')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Retorna o usuário autenticado', description: 'Rota privada. Exige cookie de access token válido.' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token ausente, inválido ou expirado.' })
  async me(@Req() req: any & { cookies: Record<string, string> }): Promise<MeResponseDto> {
    return await this.authService.getMe(req) as unknown as Promise<MeResponseDto>;
  }

  @Post('refresh')
  @HttpCode(200)
  @SkipAudit()
  @ApiCookieAuth('refresh-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Renova a sessão', description: 'Usa o cookie de refresh token para gerar novos cookies de access token e refresh token. O perfil vem sempre do banco: uma troca de senha ou de perfil encerra a sessão.' })
  @ApiOkResponse({ schema: { example: { message: 'Sessão renovada com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Refresh token ausente, inválido, expirado ou sessão encerrada por troca de senha/perfil.' })
  async refresh(@Req() req: Request & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response) {
    const refreshCookie = req.cookies[refreshCookieName()];
    if (!refreshCookie) throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    try {
      const { accessToken, refreshToken, sessionTtlMs } = await this.authService.refreshTokens(refreshCookie);
      setCookie(res, accessCookieName(), accessToken, ACCESS_TOKEN_TTL_MS);
      setCookie(res, refreshCookieName(), refreshToken, sessionTtlMs);
      return { message: 'Sessão renovada com sucesso!' };
    } catch (err: unknown) {
      // An ended session also loses its cookies, so the front-end stops treating the browser as logged in.
      clearCookie(res, accessCookieName());
      clearCookie(res, refreshCookieName());
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'LOGOUT', resource: 'auth', summary: 'Logout', target: 'self', snapshot: false })
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Encerra a sessão autenticada', description: 'Rota privada. Revoga o refresh token e remove cookies de sessão.' })
  @ApiOkResponse({ schema: { example: { message: 'Deslogado com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Access token ausente, inválido ou expirado.' })
  async logout(@Req() req: any & { user: { userId: number } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    clearCookie(res, accessCookieName());
    clearCookie(res, refreshCookieName());
    return { message: 'Deslogado com sucesso!' };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } })
  @Post('request-login')
  @HttpCode(200)
  @Audit({ action: 'LOGIN_REQUEST', resource: 'auth', summary: 'Validação de e-mail e senha (envio do código 2FA)', target: 'none' })
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Solicita login com 2FA', description: 'Rota pública. Valida e-mail e senha, envia o código 2FA e grava cookie temporário HTTP-only. Com rememberMe a sessão criada no login dura 30 dias sem uso (sem ele, 3 dias).' })
  @ApiBody({ type: RequestLoginDto })
  @ApiOkResponse({ schema: { example: { requires2FA: true } } })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas.' })
  async requestLogin(@Body() dto: RequestLoginDto, @Res({ passthrough: true }) res: Response) {
    const tmpToken = await this.authService.requestLogin(dto);
    setCookie(res, TWO_FACTOR_COOKIE, tmpToken, CODE_TTL_MS);
    return { requires2FA: true };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } })
  @Audit({ action: 'LOGIN', resource: 'auth', summary: 'Login com código 2FA', target: 'none' })
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Confirma login com 2FA', description: 'Rota pública. Usa o cookie temporário de 2FA e o código informado para criar os cookies de sessão. Cada código vale uma única vez.' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ schema: { example: { message: 'Autenticado com 2FA' } } })
  @ApiUnauthorizedResponse({ description: 'Código inválido, expirado, já utilizado ou cookie temporário ausente.' })
  async login(@Body() dto: LoginDto, @Req() req: Request & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response) {
    const tmpToken = req.cookies[TWO_FACTOR_COOKIE]; if (!tmpToken) throw new UnauthorizedException('Código expirado. Solicite um novo código.');
    const { accessToken, refreshToken, sessionTtlMs } = await this.authService.login(dto.code, tmpToken);
    clearCookie(res, TWO_FACTOR_COOKIE);
    setCookie(res, accessCookieName(), accessToken, ACCESS_TOKEN_TTL_MS);
    setCookie(res, refreshCookieName(), refreshToken, sessionTtlMs);
    return { message: 'Autenticado com 2FA' };
  }

  @Post('request-reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000, blockDuration: 10 * 60_000 } })
  @Audit({ action: 'PASSWORD_RESET_REQUEST', resource: 'auth', summary: 'Pedido de código para redefinir a senha', target: 'none' })
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Solicita redefinição de senha', description: 'Rota pública. Responde sempre da mesma forma, exista ou não o e-mail, para não revelar quais contas estão cadastradas. Se existir, envia o código por e-mail. Grava cookie temporário HTTP-only.' })
  @ApiBody({ type: RequestResetPasswordDto })
  @ApiOkResponse({ schema: { example: { message: RESET_REQUEST_MESSAGE } } })
  async requestPasswordReset(@Body() dto: RequestResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const tmpToken = await this.authService.requestPasswordReset(dto.email);
    setCookie(res, RESET_COOKIE, tmpToken, CODE_TTL_MS);
    return { message: RESET_REQUEST_MESSAGE };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000, blockDuration: 10 * 60_000 } })
  @Audit({ action: 'PASSWORD_RESET', resource: 'auth', summary: 'Redefinição de senha pelo código enviado por e-mail', target: 'none' })
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Redefine senha', description: 'Rota pública. Usa o cookie temporário de reset e o código enviado por e-mail para alterar a senha. O código vale uma única vez e a troca encerra todas as sessões abertas da conta.' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ schema: { example: { message: 'Senha redefinida com sucesso' } } })
  @ApiUnauthorizedResponse({ description: 'Código inválido, expirado, já utilizado ou cookie temporário ausente.' })
  async passwordReset(@Body() dto: ResetPasswordDto, @Req() req: Request & { cookies: Record<string, string> }, @Res({ passthrough: true }) res: Response) {
    const tmpToken = req.cookies[RESET_COOKIE]; if (!tmpToken) throw new UnauthorizedException('Código expirado. Solicite um novo código.');
    await this.authService.passwordReset(dto.code, dto.newPassword, tmpToken);
    clearCookie(res, RESET_COOKIE);
    return { message: 'Senha redefinida com sucesso' };
  }
}
