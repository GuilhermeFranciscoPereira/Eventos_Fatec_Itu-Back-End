import { memoryStorage } from 'multer';
import { Module } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { CarouselController } from './carousel.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ storage: memoryStorage() }),
    CloudinaryModule
  ],
  providers: [CarouselService],
  controllers: [CarouselController],
})
export class CarouselModule { }