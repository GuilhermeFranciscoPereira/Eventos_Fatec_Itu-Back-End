import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';

type CodePurpose = '2fa' | 'reset';

type CodeTokenPayload = {
  sub: number;
  purpose: CodePurpose;
  jti: string;
  codeHash: string;
  exp?: number;
};

type CodeTokenState = { failures: number; used: boolean; expiresAt: number };

const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  // The API runs as a single instance, so memory is enough to count attempts during the 15 minutes a code lives.
  private readonly codeTokens = new Map<string, CodeTokenState>();
  private readonly pepper: string;
  private readonly hashSecret: string;
  private readonly refreshSecret: string;
  private readonly ACCESS_COOKIE: string;
  private readonly REFRESH_COOKIE: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {
    this.pepper = this.config.getOrThrow<string>('PASSWORD_PEPPER');
    this.hashSecret = this.config.getOrThrow<string>('TOKEN_HASH_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.ACCESS_COOKIE = this.config.getOrThrow<string>('ACCESS_COOKIE_NAME');
    this.REFRESH_COOKIE = this.config.getOrThrow<string>('REFRESH_COOKIE_NAME');
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
  }

  async requestLogin(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('E-mail ou senha inválidos.');

    const ok = await argon2.verify(user.password, dto.password + this.pepper);
    if (!ok) throw new UnauthorizedException('E-mail ou senha inválidos.');

    const { code, token } = this.createCodeToken(user.id, '2fa');
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, '2fa');
    this.emailService.send(user.email, 'Autenticação em dois fatores', emailBodyMessage);

    return token;
  }

  async login(code: string, tmpToken: string) {
    const userId = this.consumeCodeToken(tmpToken, code, '2fa');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado!');

    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = jwtSign(payload, this.refreshSecret, { algorithm: 'HS256', expiresIn: '3d' });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    const tokenHash = createHmac('sha256', this.hashSecret).update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return { accessToken, refreshToken };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('E-mail não cadastrado.');

    const { code, token } = this.createCodeToken(user.id, 'reset');
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, 'reset');
    await this.emailService.send(user.email, 'Redefinição de senha', emailBodyMessage);
    return token;
  }

  async passwordReset(code: string, newPassword: string, tmpToken: string): Promise<boolean> {
    const userId = this.consumeCodeToken(tmpToken, code, 'reset');
    const hash = await argon2.hash(newPassword + this.pepper, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return true;
  }

  private hashCode(code: string, userId: number, purpose: CodePurpose, jti: string): string {
    return createHmac('sha256', this.hashSecret).update(`${purpose}:${userId}:${jti}:${code}`).digest('hex');
  }

  // The token goes to the browser in a cookie and its payload is readable, so it carries only an HMAC of the code, never the code itself.
  private createCodeToken(userId: number, purpose: CodePurpose): { code: string; token: string } {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const jti = randomUUID();
    const payload: CodeTokenPayload = { sub: userId, purpose, jti, codeHash: this.hashCode(code, userId, purpose, jti) };
    return { code, token: this.jwtService.sign(payload, { expiresIn: '15m' }) };
  }

  private consumeCodeToken(token: string, code: string, purpose: CodePurpose): number {
    let payload: CodeTokenPayload;
    try {
      payload = this.jwtService.verify<CodeTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Código expirado. Solicite um novo código.');
    }

    const invalidMessage = purpose === '2fa' ? 'Código 2FA inválido' : 'Código inválido';
    if (payload.purpose !== purpose || !payload.jti || !payload.codeHash) throw new UnauthorizedException(invalidMessage);

    this.removeExpiredCodeTokens();
    const state = this.codeTokens.get(payload.jti) ?? { failures: 0, used: false, expiresAt: (payload.exp ?? 0) * 1000 };
    if (state.used) throw new UnauthorizedException('Este código já foi utilizado. Solicite um novo código.');
    if (state.failures >= MAX_CODE_ATTEMPTS) throw new UnauthorizedException('Muitas tentativas inválidas. Solicite um novo código.');

    const expected = Buffer.from(payload.codeHash, 'hex');
    const received = Buffer.from(this.hashCode(code, payload.sub, purpose, payload.jti), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      this.codeTokens.set(payload.jti, { ...state, failures: state.failures + 1 });
      throw new UnauthorizedException(invalidMessage);
    }

    this.codeTokens.set(payload.jti, { ...state, used: true });
    return payload.sub;
  }

  private removeExpiredCodeTokens(): void {
    const now = Date.now();
    for (const [jti, state] of this.codeTokens) {
      if (state.expiresAt <= now) this.codeTokens.delete(jti);
    }
  }

  async getMe(req: Request & { cookies: Record<string, string> }) {
    try {
      const accessToken = req.cookies[this.ACCESS_COOKIE];
      const refreshToken = req.cookies[this.REFRESH_COOKIE];

      const payload = await this.jwtService.verify(accessToken) as JwtPayload & {
        sub: number;
        email: string;
        imageUrl?: string;
        name: string;
        role: string;
        purpose?: CodePurpose;
        exp: number;
        iat: number;
      };
      if (payload.purpose || !payload.role) throw new UnauthorizedException();

      let refreshTokenExp: number | null = null;
      let refreshTokenIat: number | null = null;
      if (refreshToken) {
        const r = jwtVerify(refreshToken, this.refreshSecret) as JwtPayload;
        if (r.exp) { refreshTokenExp = r.exp };
        if (r.iat) { refreshTokenIat = r.iat };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { name: true, email: true, imageUrl: true },
      });
      if (!user) throw new UnauthorizedException('Usuário não encontrado');

      return {
        sub: payload.sub,
        name: user.name,
        imageUrl: user.imageUrl,
        email: user.email,
        role: payload.role,
        exp: payload.exp,
        iat: payload.iat
      };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado!');
    }
  }

  async refreshTokens(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    type RefreshPayload = {
      sub: number;
      name: string;
      email: string;
      role: string;
      exp: number;
      iat: number;
    }

    let payload: RefreshPayload;

    try {
      payload = jwtVerify(oldRefreshToken, this.refreshSecret) as unknown as RefreshPayload;
    } catch (err: any) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    const tokenHash = createHmac('sha256', this.hashSecret).update(oldRefreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) { throw new UnauthorizedException('Sessão expirada. Faça login novamente.') };

    const jwtPayload = {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };

    const accessToken = this.jwtService.sign(jwtPayload, { expiresIn: '15m' });
    const refreshToken = jwtSign(jwtPayload, this.refreshSecret, { algorithm: 'HS256', expiresIn: '3d' });
    const newHash = createHmac('sha256', this.hashSecret).update(refreshToken).digest('hex');

    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          tokenHash: newHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { accessToken, refreshToken };
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async removeExpiredRefreshTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        isRevoked: true
      },
    });
  }

  private tokenMessageEmail(nome: string, codigo: string, type: '2fa' | 'reset'): string {
    const titleEmail = type === 'reset' ? 'Redefina sua senha com segurança' : 'Proteja sua conta com Autenticação em Dois Fatores'
    const instruction = type === 'reset' ? 'use o código abaixo para redefinir sua senha.' : 'utilize o código abaixo.'

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width"/>
        </head>
      <body style="margin:0;padding:0;width:100%;height:100%;background:#f5f7fb;font-family:Arial,sans-serif;color:#333;font-size:18px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;height:100%;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;margin:40px 0;">
              <tr>
                <td style="background:#b20000;padding:20px;text-align:center;">
                  <h2 style="margin:0;font-size:20px;color:#fff;letter-spacing:1px;">Fatec Itu – Dom Amaury Castanho</h2>
                  <p style="margin:5px 0 0;font-size:16px;color:#f8d7da;">Centro Paula Souza</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h1 style="margin:0 0 20px;font-size:22px;color:#b20000;">${titleEmail}</h1>
                  <p style="line-height:1.5;margin:0 0 15px;">Olá <strong>${nome}</strong>,</p>
                  <p style="line-height:1.5;margin:0 0 30px;">
                    Para reforçar a segurança do seu acesso, ${instruction} Ele ficará válido por <strong>15 minutos</strong> a partir do envio do e-mail.
                  </p>
                  <div style="background:linear-gradient(135deg,#b20000 0%,#d83333 100%);padding:20px;border-radius:6px;text-align:center;margin-bottom:30px;">
                    <span style="display:inline-block;font-size:32px;font-weight:bold;letter-spacing:5px;color:#fff;">${codigo}</span>
                  </div>
                  <p style="font-size:16px;color:#666;line-height:1.5;margin:0 0 30px;">
                    Se você não solicitou este código, ignore este e-mail ou entre em contato com o suporte imediatamente.
                  </p>
                  <hr style="border:none;border-top:1px solid #eaeaea;margin:40px 0;"/>
                  <h3 style="margin:0 0 10px;font-size:18px;color:#b20000;">Dicas de segurança</h3>
                  <ul style="margin:0;padding-left:20px;line-height:1.6;color:#555;font-size:16px;">
                    <li>Nunca compartilhe seu código de autenticação com terceiros.</li>
                    <li>Mantenha seu aparelho e navegador sempre atualizados.</li>
                    <li>Utilize redes e dispositivos confiáveis ao acessar sua conta.</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td style="background:#f0f0f0;text-align:center;padding:20px;font-size:12px;color:#777;">
                  © ${new Date().getFullYear()} Fatec Itu – Dom Amaury Castanho | Centro Paula Souza<br>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `
  }
}
