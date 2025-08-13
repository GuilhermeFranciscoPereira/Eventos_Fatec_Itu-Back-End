import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly config: ConfigService) {
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
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
