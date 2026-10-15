import { Module } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CarouselController } from './carousel.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule
  ],
  providers: [CarouselService],
  controllers: [CarouselController],
})
export class CarouselModule { }