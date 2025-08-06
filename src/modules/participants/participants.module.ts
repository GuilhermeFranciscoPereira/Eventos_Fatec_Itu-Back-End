import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../../services/email.service';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';

@Module({
  imports: [PrismaModule],
  providers: [ParticipantsService, EmailService],
  controllers: [ParticipantsController],
})
export class ParticipantsModule { }
