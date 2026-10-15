import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
        const rawPubKey = config.getOrThrow<string>('JWT_PUBLIC_KEY').replace(/\\n/g, '\n');
        const ACCESS_COOKIE = config.getOrThrow<string>('ACCESS_COOKIE_NAME');

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([req => req.cookies[ACCESS_COOKIE]]),
            ignoreExpiration: false,
            algorithms: ['RS256'],
            secretOrKey: rawPubKey,
        });
    }

    async validate(payload: any) {
        // 2FA and password reset tokens share the signing key, so they must never be accepted as a session.
        if (payload.purpose || !payload.role) throw new UnauthorizedException();

        // The role comes from the database on every request, and a token older than the last password or
        // role change (sessionVersion) is refused at once instead of living until it expires.
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, name: true, email: true, role: true, sessionVersion: true },
        });
        if (!user || user.sessionVersion !== (payload.sv ?? 0)) {
            throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
        }

        return { userId: user.id, name: user.name, email: user.email, role: user.role };
    }
}
