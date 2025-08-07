import { memoryStorage } from 'multer';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ storage: memoryStorage() }),
    CloudinaryModule,
    ConfigModule
  ],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }
