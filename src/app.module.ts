import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { CsrfController } from './modules/common/csrf.controller';
import { CarouselModule } from './modules/carousel/carousel.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ParticipantsModule } from './modules/participants/participants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CloudinaryModule,
    CarouselModule,
    EventsModule,
    ParticipantsModule,
  ],
  controllers: [CsrfController]
})
export class AppModule { }
