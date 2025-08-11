// src/modules/certificates/certificates.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../../services/email.service';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [CertificatesService, EmailService],
})
export class CertificatesModule { }
