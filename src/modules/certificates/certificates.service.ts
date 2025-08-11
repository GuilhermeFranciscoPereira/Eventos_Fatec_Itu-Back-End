import * as path from 'path';
import * as PDFKit from 'pdfkit';
import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { Participant, Event } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private emailService: EmailService) { }

  @Cron('* 23 * * *', { timeZone: 'America/Sao_Paulo' })
  async handleDailyCertificates() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const events = await this.prisma.event.findMany({
      where: { endTime: { gte: new Date(ontem.setHours(0, 0, 0, 0)), lte: new Date(ontem.setHours(23, 59, 59, 999)) } },
      include: { participants: true },
    });

    for (const ev of events) {
      await this.processEvent(ev);
    }
  }

  private async processEvent(ev: Event & { participants: Participant[] }) {
    for (const p of ev.participants.filter(x => x.isPresent)) {
      try {
        const pdfBuffer = await this.createPdf(p, ev);
        const html = this.certificateMessageEmail(p.name, ev.name);
        await this.emailService.send(
          p.email,
          `Seu Certificado – ${ev.name}`,
          html,
          [{ filename: 'certificado.pdf', content: pdfBuffer }],
        );
        await this.prisma.participant.update({
          where: { id: p.id },
          data: { certificateSent: true },
        });
      } catch (err: any) {
        console.error(`Erro ao gerar/enviar certificado para ${p.email}: ${err.message}`);
      }
    }
  }

  private createPdf(p: Participant, ev: Event): Promise<Buffer> {
    return new Promise(resolve => {
      const doc = new PDFKit({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const { width, height } = doc.page;

      const grad = doc.linearGradient(0, 0, width, 0);
      grad.stop(0.00, '#BBC6E6');
      grad.stop(0.22, '#B8C1E0');
      grad.stop(0.50, '#b5bedd');
      grad.stop(0.78, '#aeb9d7');
      grad.stop(1.00, '#a2b1d0');

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
      const cargaHorariaCurta = `${String(horasNum).padStart(2, '0')}h${String(minutosNum).padStart(2, '0')}m`;
      const cargaHorariaExtenso = `${horasNum} ${horasNum === 1 ? 'hora' : 'horas'} e ${minutosNum} ${minutosNum === 1 ? 'minuto' : 'minutos'}`;

      const titleCase = (s: string): string => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const localEvento = ev.location !== 'OUTROS'
        ? titleCase(ev.location.replace(/_/g, ' ').replace(/\s{2,}/g, ' '))
        : (ev.customLocation ?? 'Local a definir');

      const dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      const texto =
        [
          `A Faculdade de Tecnologia de Itu – Dom Amaury Castanho certifica que ${p.name} participou do evento “${ev.name}”, ministrado por ${ev.speakerName}, realizado em ${dataEvento}, no horário de ${horaInicio} às ${horaFim}, em ${localEvento}.`,
          `A participação corresponde à carga horária total de ${cargaHorariaCurta} (${cargaHorariaExtenso}).`,
          `Este certificado é emitido para fins de comprovação de participação e poderá ser utilizado para registro de atividades acadêmicas complementares, conforme normas internas.`,
          `Curso: ${ev.course}${ev.semester ? ` • Semestre: ${ev.semester}` : ''}.`,
          `Itu, ${dataEmissao}.`
        ].join('\n\n');

      doc
        .font('Helvetica')
        .fontSize(18)
        .text(texto, 60, contentTop, {
          width: width - 120,
          height: textBlockHeight,
          align: 'justify',
          lineGap: 6,
        });

      const footerImage = (doc as any).openImage(footerImg) as { width: number; height: number };
      const footerWidth = width;
      const footerHeightScaled = footerImage.height * (footerWidth / footerImage.width);
      const footerY = height - footerHeightScaled;
      doc.image(footerImg, 0, footerY, { width: footerWidth });

      doc.end();
    });
  }

  private certificateMessageEmail(nome: string, evento: string): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width"/>
      </head>
      <body style="margin:0;padding:0;width:100%;height:100%;background:#f5f7fb;font-family:Arial,sans-serif;color:#333;font-size:18px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;height:100%;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;margin:40px 0;">
              <tr>
                <td style="background:#b20000;padding:20px;text-align:center;">
                  <h2 style="margin:0;font-size:20px;color:#fff;letter-spacing:1px;">Fatec Itu – Dom Amaury Castanho</h2>
                  <p style="margin:5px 0 0;font-size:16px;color:#f8d7da;">Centro Paula Souza</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h1 style="margin:0 0 20px;font-size:22px;color:#b20000;">Seu Certificado de Participação</h1>
                  <p style="line-height:1.5;margin:0 0 15px;">Olá <strong>${nome}</strong>,</p>
                  <p style="line-height:1.5;margin:0 0 30px;">
                    Parabéns por participar do evento <strong>${evento}</strong>! 
                    Segue em anexo o seu certificado de participação, válido para comprovação de presença.
                  </p>
                  <div style="background:linear-gradient(135deg,#b20000 0%,#d83333 100%);padding:20px;border-radius:6px;text-align:center;margin-bottom:30px;">
                    <span style="display:inline-block;font-size:18px;color:#fff;">
                      Certificado em anexo
                    </span>
                  </div>
                  <p style="font-size:16px;color:#666;line-height:1.5;margin:0 0 30px;">
                    Caso tenha alguma dúvida ou não receba o anexo, entre em contato conosco.
                  </p>
                  <hr style="border:none;border-top:1px solid #eaeaea;margin:40px 0;"/>
                  <h3 style="margin:0 0 10px;font-size:18px;color:#b20000;">Dicas</h3>
                  <ul style="margin:0;padding-left:20px;line-height:1.6;color:#555;font-size:16px;">
                    <li>Verifique sua caixa de spam caso não veja o e-mail.</li>
                    <li>Abra o PDF com leitor atualizado.</li>
                    <li>Guarde seu certificado para futuras comprovações.</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td style="background:#f0f0f0;text-align:center;padding:20px;font-size:12px;color:#777;">
                  © ${new Date().getFullYear()} Fatec Itu – Dom Amaury Castanho | Centro Paula Souza<br>
                  Este é um e-mail automático, por favor, não responda.
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `;
  }

}
