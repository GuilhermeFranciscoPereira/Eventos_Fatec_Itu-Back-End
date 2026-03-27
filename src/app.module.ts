import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CsrfController } from './modules/common/csrf.controller';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CarouselModule } from './modules/carousel/carousel.module';
import { LocationsModule } from './modules/location/locations.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { CertificatesModule } from './modules/certificates/certificates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60_000,
      limit: 50
    }]),
    AuthModule,
    CarouselModule,
    CategoriesModule,
    CertificatesModule,
    CloudinaryModule,
    CoursesModule,
    EventsModule,
    LocationsModule,
    ParticipantsModule,
    PrismaModule,
    UsersModule,
  ],
  controllers: [CsrfController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule { }
