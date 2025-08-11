import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private config: ConfigService) { }

  onModuleInit() {
    const host = this.config.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = parseInt(this.config.get<string>('MAIL_PORT', '587'), 10);
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    } as SMTPTransport.Options);
  }

  async send(to: string, subject: string, html: string, attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>) {
    try {
      await this.transporter.sendMail({ from: this.config.get<string>('MAIL_FROM'), to, subject, html, attachments });
    } catch (err: any) {
      throw new InternalServerErrorException(`Falha ao enviar e-mail! \nErro: ${err.message}`);
    }
  }
}
