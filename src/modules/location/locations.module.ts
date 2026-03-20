import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [PrismaModule],
  providers: [LocationsService],
  controllers: [LocationsController],
})
export class LocationsModule { }