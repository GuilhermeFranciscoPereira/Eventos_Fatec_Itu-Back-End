import helmet from 'helmet';
import * as csurf from 'csurf';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  app.setGlobalPrefix(config.get<string>('GLOBAL_PREFIX', ''));

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '').split(','),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  app.use(cookieParser());
  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        secure: config.get<string>('NODE_ENV') === 'production', //Exige https em prod
        sameSite: config.get<string>('NODE_ENV') === 'production' ? ('none' as const) : ('lax' as const),
        domain: config.get<string>('COOKIE_DOMAIN'),
        path: '/'
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(config.get<number>('PORT', 3000));
}

bootstrap();
