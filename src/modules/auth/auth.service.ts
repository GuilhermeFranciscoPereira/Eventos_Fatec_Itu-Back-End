import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthCodePurpose, User } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditContext } from '../audit/audit.context';
import { EmailService } from '../../services/email.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { JwtPayload, sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';

type CodePurpose = '2fa' | 'reset';

type CodeTokenPayload = {
  sub: number;
  purpose: CodePurpose;
  jti: string;
  rm?: boolean;
  exp?: number;
};

type SessionPayload = {
  sub: number;
  name: string;
  email: string;
  role: string;
  sv?: number;
  rm?: boolean;
};

const MAX_CODE_ATTEMPTS = 5;
const CODE_TTL_MS = 15 * 60 * 1000;
const EXPIRED_CODE_MESSAGE = 'Código expirado. Solicite um novo código.';
const USED_CODE_MESSAGE = 'Este código já foi utilizado. Solicite um novo código.';
const SESSION_ENDED_MESSAGE = 'Sessão expirada. Faça login novamente.';

const PURPOSES: Record<CodePurpose, AuthCodePurpose> = {
  '2fa': AuthCodePurpose.TWO_FACTOR,
  reset: AuthCodePurpose.PASSWORD_RESET,
};

// One value for the JWT, the cookie and the database record, so the session never outlives any of them.
// Each refresh starts the period again, so only a session left unused for the whole period ends by itself.
export const REFRESH_TOKEN_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionTokens = { accessToken: string; refreshToken: string; sessionTtlMs: number };

@Injectable()
export class AuthService {
  private readonly pepper: string;
  private readonly hashSecret: string;
  private readonly refreshSecret: string;
  private readonly ACCESS_COOKIE: string;
  private readonly REFRESH_COOKIE: string;
  private dummyHash?: Promise<string>;

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

  async requestLogin(dto: { email: string; password: string; rememberMe?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Checks a throwaway hash so an unknown e-mail takes as long to answer as a wrong password.
      await argon2.verify(await this.getDummyHash(), dto.password + this.pepper).catch(() => false);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    AuditContext.setTarget(user.id, `${user.name} (${user.email})`);

    const ok = await argon2.verify(user.password, dto.password + this.pepper);
    if (!ok) throw new UnauthorizedException('E-mail ou senha inválidos.');
    AuditContext.setActor(user);

    // The choice travels inside the signed 2FA token, so it cannot be changed between the two login steps.
    const { code, token } = await this.createCodeToken(user.id, '2fa', dto.rememberMe === true);
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, '2fa');
    this.sendInBackground(user.email, 'Autenticação em dois fatores', emailBodyMessage);

    return token;
  }

  async login(code: string, tmpToken: string): Promise<SessionTokens> {
    const { userId, rememberMe } = await this.consumeCodeToken(tmpToken, code, '2fa');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado!');
    AuditContext.setActor(user);

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    const { accessToken, refreshToken, sessionTtlMs, record } = this.signSession(user, rememberMe);
    await this.prisma.refreshToken.create({ data: record });

    return { accessToken, refreshToken, sessionTtlMs };
  }

  // Same answer, same cookie and same code row for an unknown e-mail: the form never reveals which accounts exist.
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    AuditContext.addDetails({ accountFound: !!user });

    if (!user) {
      const { token } = await this.createCodeToken(null, 'reset');
      return token;
    }

    AuditContext.setTarget(user.id, `${user.name} (${user.email})`);
    const { code, token } = await this.createCodeToken(user.id, 'reset');
    const emailBodyMessage = this.tokenMessageEmail(user.name, code, 'reset');
    // Not awaited: waiting for the mail server would make existing e-mails answer slower than unknown ones.
    this.sendInBackground(user.email, 'Redefinição de senha', emailBodyMessage);
    return token;
  }

  async passwordReset(code: string, newPassword: string, tmpToken: string): Promise<boolean> {
    const { userId } = await this.consumeCodeToken(tmpToken, code, 'reset');
    const hash = await argon2.hash(newPassword + this.pepper, { type: argon2.argon2id });

    // A new password ends every open session and every pending code of the account.
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { password: hash, sessionVersion: { increment: 1 } } }),
      this.prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } }),
      this.prisma.authCode.deleteMany({ where: { userId, usedAt: null } }),
    ]);
    AuditContext.setActor(user);

    return true;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomUUID(), { type: argon2.argon2id });
    return this.dummyHash;
  }

  private sendInBackground(to: string, subject: string, html: string): void {
    // EmailService already logs the failure; without this catch a mail server error would crash the API (unhandled rejection).
    this.emailService.send(to, subject, html).catch(() => undefined);
  }

  private hashCode(code: string, userId: number, purpose: CodePurpose, jti: string): string {
    return createHmac('sha256', this.hashSecret).update(`${purpose}:${userId}:${jti}:${code}`).digest('hex');
  }

  // The cookie only carries the id of the code: its HMAC, attempts and use are kept in the database.
  private async createCodeToken(userId: number | null, purpose: CodePurpose, rememberMe = false): Promise<{ code: string; token: string }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const jti = randomUUID();

    await this.prisma.$transaction([
      // Only the newest code of each kind works: asking again cancels the previous one.
      ...(userId ? [this.prisma.authCode.deleteMany({ where: { userId, purpose: PURPOSES[purpose], usedAt: null } })] : []),
      this.prisma.authCode.create({
        data: {
          id: jti,
          userId,
          purpose: PURPOSES[purpose],
          codeHash: this.hashCode(code, userId ?? 0, purpose, jti),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);

    const payload: CodeTokenPayload = { sub: userId ?? 0, purpose, jti, ...(rememberMe && { rm: true }) };
    return { code, token: this.jwtService.sign(payload, { expiresIn: '15m' }) };
  }

  private async consumeCodeToken(token: string, code: string, purpose: CodePurpose): Promise<{ userId: number; rememberMe: boolean }> {
    let payload: CodeTokenPayload;
    try {
      payload = this.jwtService.verify<CodeTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(EXPIRED_CODE_MESSAGE);
    }

    const invalidMessage = purpose === '2fa' ? 'Código 2FA inválido' : 'Código inválido';
    if (payload.purpose !== purpose || !payload.jti) throw new UnauthorizedException(invalidMessage);

    const record = await this.prisma.authCode.findUnique({ where: { id: payload.jti } });
    if (!record || record.purpose !== PURPOSES[purpose] || (record.userId ?? 0) !== payload.sub) {
      throw new UnauthorizedException(EXPIRED_CODE_MESSAGE);
    }
    if (record.userId) AuditContext.setTarget(record.userId);

    if (record.usedAt) throw new UnauthorizedException(USED_CODE_MESSAGE);
    if (record.expiresAt <= new Date()) throw new UnauthorizedException(EXPIRED_CODE_MESSAGE);
    if (record.failures >= MAX_CODE_ATTEMPTS) throw new UnauthorizedException('Muitas tentativas inválidas. Solicite um novo código.');

    const expected = Buffer.from(record.codeHash, 'hex');
    const received = Buffer.from(this.hashCode(code, payload.sub, purpose, payload.jti), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received) || !record.userId) {
      await this.prisma.authCode.update({ where: { id: record.id }, data: { failures: { increment: 1 } } });
      throw new UnauthorizedException(invalidMessage);
    }

    // Conditional update: two requests with the right code at the same moment cannot both pass.
    const claimed = await this.prisma.authCode.updateMany({
      where: { id: record.id, usedAt: null, failures: { lt: MAX_CODE_ATTEMPTS } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new UnauthorizedException(USED_CODE_MESSAGE);

    return { userId: record.userId, rememberMe: payload.rm === true };
  }

  // Name, e-mail and role always come from the database, and sessionVersion ties the tokens to the current password and role.
  // "Lembrar-me" (rm) is kept in the refresh token, so every renewal keeps the 30-day period chosen at login.
  private signSession(user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'sessionVersion'>, rememberMe: boolean) {
    const sessionTtlMs = rememberMe ? REMEMBER_ME_TTL_MS : REFRESH_TOKEN_TTL_MS;
    const payload: SessionPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sv: user.sessionVersion,
      ...(rememberMe && { rm: true }),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = jwtSign(payload, this.refreshSecret, { algorithm: 'HS256', expiresIn: sessionTtlMs / 1000 });
    const tokenHash = createHmac('sha256', this.hashSecret).update(refreshToken).digest('hex');

    return {
      accessToken,
      refreshToken,
      sessionTtlMs,
      record: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + sessionTtlMs) },
    };
  }

  async getMe(req: Request & { cookies: Record<string, string> }) {
    try {
      const accessToken = req.cookies[this.ACCESS_COOKIE];

      const payload = await this.jwtService.verify(accessToken) as JwtPayload & SessionPayload & {
        purpose?: CodePurpose;
        exp: number;
        iat: number;
      };
      if (payload.purpose || !payload.role) throw new UnauthorizedException();

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { name: true, email: true, imageUrl: true, role: true, sessionVersion: true },
      });
      // A token issued before a password or role change no longer counts.
      if (!user || user.sessionVersion !== (payload.sv ?? 0)) throw new UnauthorizedException('Usuário não encontrado');

      return {
        sub: payload.sub,
        name: user.name,
        imageUrl: user.imageUrl,
        email: user.email,
        role: user.role,
        exp: payload.exp,
        iat: payload.iat
      };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado!');
    }
  }

  async refreshTokens(oldRefreshToken: string): Promise<SessionTokens> {
    let payload: SessionPayload;

    try {
      payload = jwtVerify(oldRefreshToken, this.refreshSecret) as unknown as SessionPayload;
    } catch {
      throw new UnauthorizedException(SESSION_ENDED_MESSAGE);
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

    if (!storedToken) { throw new UnauthorizedException(SESSION_ENDED_MESSAGE) };

    // The old token's role is never copied: a demoted user gets the new role or, after the change, no session at all.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.sessionVersion !== (payload.sv ?? 0)) {
      await this.prisma.refreshToken.updateMany({ where: { id: storedToken.id }, data: { isRevoked: true } });
      throw new UnauthorizedException(SESSION_ENDED_MESSAGE);
    }

    const { accessToken, refreshToken, sessionTtlMs, record } = this.signSession(user, payload.rm === true);

    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.create({ data: record }),
    ]);

    return { accessToken, refreshToken, sessionTtlMs };
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async removeExpiredRefreshTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        isRevoked: true
      },
    });
    await this.prisma.authCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
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
            <table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:8px;overflow:hidden;margin:40px 0;">
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
                  <!-- Gmail and Outlook drop gradient backgrounds, which left white text on white: solid light box with red code instead. -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 30px;">
                    <tr>
                      <td align="center" bgcolor="#fdecec" style="background-color:#fdecec;border:2px dashed #b20000;border-radius:6px;padding:20px;">
                        <span style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:8px;color:#b20000;">${codigo}</span>
                      </td>
                    </tr>
                  </table>
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
