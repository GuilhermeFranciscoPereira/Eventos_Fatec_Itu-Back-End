import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Injectable, OnModuleInit, InternalServerErrorException, Logger } from '@nestjs/common';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
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
    } catch (err: unknown) {
      // SMTP errors can expose host and credential details, so they stay in the server log only
      this.logger.error('Failed to send e-mail', err instanceof Error ? err.stack : String(err));
      throw new InternalServerErrorException('Não foi possível enviar o e-mail. Tente novamente em alguns minutos.');
    }
  }
}
