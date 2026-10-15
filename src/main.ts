import helmet from 'helmet';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureSwagger } from './swagger';
import { createCsrfProtection } from './modules/common/csrf';
import { ThrottlerExceptionFilter } from './modules/common/throttler-exception.filter';
import { validationExceptionFactory } from './modules/common/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  app.setGlobalPrefix(config.get<string>('GLOBAL_PREFIX', ''));

  // Behind a reverse proxy every request arrives with the proxy's IP, so the rate limits would be shared by all users.
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'", 'https://agendafatecitu.com.br'],
      },
    },
  }));
  app.use(compression());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '').split(','),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  configureSwagger(app, config);

  app.use(cookieParser());

  app.use(createCsrfProtection({
    csrfSecret: config.get<string>('CSRF_SECRET'),
    tokenHashSecret: config.getOrThrow<string>('TOKEN_HASH_SECRET'),
    production: config.get<string>('NODE_ENV') === 'production',
    cookieDomain: config.get<string>('COOKIE_DOMAIN'),
  }));

  app.useGlobalFilters(new ThrottlerExceptionFilter())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  await app.listen(config.get<number>('PORT', 3000));
}

bootstrap();
