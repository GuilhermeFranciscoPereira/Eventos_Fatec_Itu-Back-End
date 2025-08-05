import { memoryStorage } from 'multer';
import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule { }
  