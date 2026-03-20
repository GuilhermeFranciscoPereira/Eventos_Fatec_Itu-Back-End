import * as path from 'path';
import * as QRCode from 'qrcode';
import * as PDFKit from 'pdfkit';
import { Cron } from '@nestjs/schedule';
import { Location } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Participant, Event, Course } from '@prisma/client';
import { EmailService } from '../../services/email.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private emailService: EmailService) { }

  @Cron('0 20 * * *', { timeZone: 'America/Sao_Paulo' })
  async handleDailyCertificates() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: { endTime: { gte: start, lte: end } },
      include: { participants: true, course: true, location: true }
    });

    for (const ev of events) await this.processEvent(ev);
  }

  async verifyToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const cert = await this.prisma.certificate.findUnique({
      where: { tokenHash },
      include: { participant: true, event: { include: { course: true, location: true } } }
    });
    if (!cert) return null;

    const e = cert.event;
    const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(e.startDate);
    const hIni = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(e.startTime);
    const hFim = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(e.endTime);

    return {
      aluno: cert.participant.name,
      email: cert.participant.email,
      evento: e.name,
      palestrante: e.speakerName,
      data: data,
      horario: `${hIni} às ${hFim}`,
      local: e.location.name.toLowerCase() !== 'outros' ? e.location.name : (e.customLocation ?? ''),
      curso: e.course?.name ?? null,
      emitidoEm: cert.issuedAt,
    };
  }

  private async processEvent(ev: Event & { participants: Participant[]; course: Course | null; location: Location }) {
    for (const p of ev.participants.filter(x => x.isPresent && !x.certificateSent)) {
      try {
        const { token, tokenHash } = this.genToken();

        await this.prisma.$transaction(async tx => {
          const existing = await tx.certificate.findFirst({
            where: { participantId: p.id, eventId: ev.id },
            select: { id: true },
          });

          if (existing) {
            await tx.certificate.update({
              where: { id: existing.id },
              data: { tokenHash },
            });
          } else {
            await tx.certificate.create({
              data: { participantId: p.id, eventId: ev.id, tokenHash },
            });
          }
        });

        const url = this.buildVerificationUrl(token);
        const qrPng = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', margin: 2, scale: 6 });
        const pdfBuffer = await this.createPdf(p, ev, qrPng);
        const html = this.certificateMessageEmail(p.name, ev.name);

        await this.emailService.send(p.email, `Seu Certificado – ${ev.name}`, html, [
          { filename: `certificado_${ev.name.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
        ]);

        await this.prisma.participant.update({
          where: { id: p.id },
          data: { certificateSent: true },
        });
      } catch (e) {
        console.log(`processEvent failed for participant ${p.id} on event ${ev.id}`, e);
      }
    }
  }

  private genToken() {
    const token = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private buildVerificationUrl(token: string) {
    return `${process.env.CORS_ORIGINS}/Verification/${token}`;
  }

  private createPdf(p: Participant, ev: Event & { course: Course | null; location: Location }, qrPng: Buffer): Promise<Buffer> {
    return new Promise(resolve => {
      const doc = new PDFKit({ size: 'A4', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const { width, height } = doc.page;

      const grad = doc.linearGradient(0, 0, width, 0);
      grad.stop(0.0, '#BBC6E6'); grad.stop(0.22, '#B8C1E0'); grad.stop(0.5, '#b5bedd'); grad.stop(0.78, '#aeb9d7'); grad.stop(1.0, '#a2b1d0');
      doc.rect(0, 0, width, height).fill(grad);
      doc.fillColor('#000');

      const assetsDir = path.resolve(process.cwd(), 'src/assets/certificate');
      const headerImg = path.join(assetsDir, 'header_certificate.jpeg');
      const footerImg = path.join(assetsDir, 'footer_certificate.jpeg');

      const headerHeight = 150;
      doc.image(headerImg, 0, 0, { fit: [width, headerHeight] });

      const contentTop = headerHeight + 20;
      const footerMaxHeight = 200;
      const textBlockHeight = height - contentTop - footerMaxHeight - 20;

      const dataEvento = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(ev.startDate);
      const horaInicio = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(ev.startTime);
      const horaFim = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(ev.endTime);

      const durMs = ev.endTime.getTime() - ev.startTime.getTime();
      const durMin = Math.floor(durMs / 60000);
      const horasNum = Math.floor(durMin / 60);
      const minutosNum = durMin % 60;
      const cargaCurta = `${String(horasNum).padStart(2, '0')}h${String(minutosNum).padStart(2, '0')}m`;
      const cargaExtenso = `${horasNum} ${horasNum === 1 ? 'hora' : 'horas'} e ${minutosNum} ${minutosNum === 1 ? 'minuto' : 'minutos'}`;

      const localEvento = ev.location.name.toLowerCase() !== 'outros'
        ? ev.location.name
        : (ev.customLocation ?? 'Local a definir');

      const texto = [
        `A Faculdade de Tecnologia de Itu – Dom Amaury Castanho certifica que ${p.name} participou do evento “${ev.name}”, ministrado por ${ev.speakerName}, realizado em ${dataEvento}, no horário de ${horaInicio} às ${horaFim}, em ${localEvento}.`,
        `A participação corresponde à carga horária total de ${cargaCurta} (${cargaExtenso}).`,
      ].join('\n\n');

      const footerImage: any = (doc as any).openImage(footerImg);
      const footerWidth = width;
      const footerHeightScaled = footerImage.height * (footerWidth / footerImage.width);
      const footerY = height - footerHeightScaled;
      doc.image(footerImg, 0, footerY, { width: footerWidth });

      const textTop = contentTop;
      const textHeight = textBlockHeight;
      const textMiddle = textTop + textHeight / 2;

      const qrSize = 140;
      const qrX = width - qrSize - 80;
      const qrY = textMiddle - qrSize / 2 - 32;

      doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

      doc.font('Helvetica').fontSize(15).text(texto, 80, contentTop, {
        width: qrX - 120,
        align: 'justify',
        lineGap: 6
      });

      doc.end();
    });
  }

  private certificateMessageEmail(nome: string, evento: string): string {
    return `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
    <body style="margin:0;padding:0;width:100%;height:100%;background:#f5f7fb;font-family:Arial,sans-serif;color:#333;font-size:18px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;height:100%;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;margin:40px 0;">
            <tr><td style="background:#b20000;padding:20px;text-align:center;">
              <h2 style="margin:0;font-size:20px;color:#fff;letter-spacing:1px;">Fatec Itu – Dom Amaury Castanho</h2>
              <p style="margin:5px 0 0;font-size:16px;color:#f8d7da;">Centro Paula Souza</p></td></tr>
            <tr><td style="padding:30px;">
              <h1 style="margin:0 0 20px;font-size:22px;color:#b20000;">Seu Certificado de Participação</h1>
              <p style="line-height:1.5;margin:0 0 15px;">Olá <strong>${nome}</strong>,</p>
              <p style="line-height:1.5;margin:0 0 30px;">Parabéns por participar do evento <strong>${evento}</strong>! Segue em anexo o seu certificado com verificação por QRCode.</p>
              <div style="background:linear-gradient(135deg,#b20000 0%,#d83333 100%);padding:20px;border-radius:6px;text-align:center;margin-bottom:30px;">
                <span style="display:inline-block;font-size:18px;color:#fff;">Certificado em anexo</span>
              </div>
              <p style="font-size:16px;color:#666;line-height:1.5;margin:0 0 30px;">Guarde este arquivo. Em caso de dúvidas, entre em contato.</p>
            </td></tr>
            <tr><td style="background:#f0f0f0;text-align:center;padding:20px;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} Fatec Itu – Dom Amaury Castanho | Este é um e-mail automático.</td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }
}
