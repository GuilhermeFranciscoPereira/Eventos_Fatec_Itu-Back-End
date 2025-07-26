import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { JwtPayload, sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly pepper: string;
  private readonly hashSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {
    this.pepper = this.config.getOrThrow<string>('PASSWORD_PEPPER');
    this.hashSecret = this.config.getOrThrow<string>('TOKEN_HASH_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
  }

  async requestLogin(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email incorreto');

    const ok = await argon2.verify(user.password, dto.password + this.pepper);
    if (!ok) throw new UnauthorizedException('Senha inválida');

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const tmpToken = this.jwtService.sign({ sub: user.id, code }, { expiresIn: '15m' });
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, '2fa');
    await this.emailService.send(user.email, 'Seu código de autenticação em dois fatores', emailBodyMessage);

    return tmpToken;
  }

  async login(code: string, tmpToken: string) {
    const payloadInitial = this.jwtService.verify<{ sub: number; code: string }>(tmpToken);
    if (payloadInitial.code !== code) { throw new UnauthorizedException('Código 2FA inválido') };

    const user = await this.prisma.user.findUnique({ where: { id: payloadInitial.sub } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado!');

    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = jwtSign(payload, this.refreshSecret, { algorithm: 'HS256', expiresIn: '7d' });

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
    if (!user) throw new UnauthorizedException('E-mail não existe!');

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const tmpToken = this.jwtService.sign({ sub: user.id, code }, { expiresIn: '15m' });
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, 'reset');
    await this.emailService.send(user.email, 'Seu código de redefinição de senha', emailBodyMessage);
    return tmpToken;
  }

  async passwordReset(code: string, newPassword: string, tmpToken: string): Promise<boolean> {
    const payload = this.jwtService.verify<{ sub: number; code: string }>(tmpToken);
    if (payload.code !== code) throw new UnauthorizedException('Código inválido');
    const hash = await argon2.hash(newPassword + this.pepper, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: payload.sub }, data: { password: hash } });
    return true;
  }

  getMe(req: Request & { cookies: Record<string, string> }) {
    try {
      const accessToken = req.cookies['access_token'];
      const refreshToken = req.cookies['refresh_token'];

      const payload = this.jwtService.verify(accessToken) as JwtPayload & {
        sub: number;
        email: string;
        name: string;
        role: string;
        exp: number;
        iat: number;
      };

      let refreshTokenExp: number | null = null;
      let refreshTokenIat: number | null = null;
      if (refreshToken) {
        const r = jwtVerify(refreshToken, this.refreshSecret) as JwtPayload;
        if (r.exp) { refreshTokenExp = r.exp };
        if (r.iat) { refreshTokenIat = r.iat };
      }

      return {
        sub: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        exp: payload.exp,
        iat: payload.iat,
        refreshToken,
        refreshTokenExp,
        refreshTokenIat,
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
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
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

    if (!storedToken) { throw new UnauthorizedException('Refresh token não encontrado ou já revogado.') };

    const jwtPayload = {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };

    const accessToken = this.jwtService.sign(jwtPayload, { expiresIn: '15m' });
    const refreshToken = jwtSign(jwtPayload, this.refreshSecret, { algorithm: 'HS256', expiresIn: '7d' });
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
