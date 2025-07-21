import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfController } from './modules/common/csrf.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [CsrfController]
})
export class AppModule { }
