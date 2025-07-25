import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { EmailService } from '../../services/email.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule, PrismaModule, JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (cfg: ConfigService): JwtModuleOptions => {
      const rawPriv = cfg.getOrThrow<string>('JWT_PRIVATE_KEY');
      const rawPub = cfg.getOrThrow<string>('JWT_PUBLIC_KEY');
      return {
        privateKey: rawPriv.replace(/\\n/g, '\n'),
        publicKey: rawPub.replace(/\\n/g, '\n'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      };
    },
  })],
  providers: [AuthService, JwtStrategy, EmailService],
  controllers: [AuthController]
})
export class AuthModule { }
