import * as path from 'path';
import * as QRCode from 'qrcode';
import * as PDFKit from 'pdfkit';
import { Cron } from '@nestjs/schedule';
import { Location } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { todayInEventClock } from '../common/event-clock';
import { Participant, Event, Course } from '@prisma/client';
import { EmailService } from '../../services/email.service';

// Read from process.cwd(): the Docker image copies src/assets/certificate next to dist.
const ASSETS_DIR = path.resolve(process.cwd(), 'src/assets/certificate');
const FONTS = {
  regular: path.join(ASSETS_DIR, 'fonts/Poppins-Regular.woff'),
  medium: path.join(ASSETS_DIR, 'fonts/Poppins-Medium.woff'),
  semiBold: path.join(ASSETS_DIR, 'fonts/Poppins-SemiBold.woff'),
  name: path.join(ASSETS_DIR, 'fonts/PlayfairDisplay-BoldItalic.woff'),
};
const LOGO_IMG = path.join(ASSETS_DIR, 'logo_fatec_itu.png');
const SIGNATURE_IMG = path.join(ASSETS_DIR, 'signature_coordinator.png');

const COLORS = { red: '#A33535', redDark: '#852727', ink: '#1F1A17', muted: '#6B625C', paper: '#FCFAF7', frame: '#D9C9C2', qrBorder: '#E2D6D0' };

type TextRun = { font: string; text: string };

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private emailService: EmailService) { }

  @Cron('0 20 * * *', { timeZone: 'America/Sao_Paulo' })
  async handleDailyCertificates() {
    const start = new Date(`${todayInEventClock()}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 1);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    const events = await this.prisma.event.findMany({
      where: { endTime: { gte: start, lte: end } },
      include: { participants: true, eventCourses: { include: { course: true } }, location: true }
    });

    for (const ev of events) await this.processEvent(ev);
  }

  async verifyToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const cert = await this.prisma.certificate.findUnique({
      where: { tokenHash },
      include: { participant: true, event: { include: { eventCourses: { include: { course: true } }, location: true } } }
    });
    if (!cert) return null;

    const e = cert.event;
    const data = this.formatDateRange(e.startDate, e.endDate);
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
      curso: e.eventCourses.map(({ course }) => course.name).join(', ') || null,
      emitidoEm: cert.issuedAt,
    };
  }

  private async processEvent(ev: Event & { participants: Participant[]; eventCourses: { course: Course }[]; location: Location }) {
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
        const qrPng = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', margin: 1, scale: 6, color: { dark: COLORS.ink, light: '#FFFFFF' } });
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
    // CORS_ORIGINS may list several comma-separated origins, so only the first one is a valid base URL.
    const frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGINS ?? '').split(',')[0];
    return `${frontendUrl.trim().replace(/\/+$/, '')}/Verification/${token}`;
  }

  private formatDateRange(startDate: Date, endDate?: Date | null): string {
    const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const start = formatter.format(startDate);
    const end = endDate ? formatter.format(endDate) : null;

    return end && end !== start ? `${start} a ${end}` : start;
  }

  private createPdf(p: Participant, ev: Event & { location: Location }, qrPng: Buffer): Promise<Buffer> {
    return new Promise(resolve => {
      const doc = new PDFKit({ size: 'A4', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.registerFont('Regular', FONTS.regular);
      doc.registerFont('Medium', FONTS.medium);
      doc.registerFont('SemiBold', FONTS.semiBold);
      doc.registerFont('Name', FONTS.name);

      const { width: W, height: H } = doc.page;

      // Paper, red corners and a double frame
      doc.rect(0, 0, W, H).fill(COLORS.paper);
      doc.polygon([0, 0], [160, 0], [0, 125]).fill(COLORS.red);
      doc.polygon([0, 0], [100, 0], [0, 78]).fill(COLORS.redDark);
      doc.polygon([W, H], [W - 160, H], [W, H - 125]).fill(COLORS.red);
      doc.polygon([W, H], [W - 100, H], [W, H - 78]).fill(COLORS.redDark);
      doc.lineWidth(1.2).strokeColor(COLORS.red).rect(28, 28, W - 56, H - 56).stroke();
      doc.lineWidth(0.5).strokeColor(COLORS.frame).rect(34, 34, W - 68, H - 68).stroke();

      // Logo and title
      const logoW = 96;
      doc.image(LOGO_IMG, W / 2 - logoW / 2, 52, { width: logoW });
      this.spacedText(doc, 'CERTIFICADO', 120, W, { size: 36, font: 'SemiBold', color: COLORS.red, spacing: 10 });
      this.spacedText(doc, 'DE PARTICIPAÇÃO', 170, W, { size: 11, font: 'Medium', color: COLORS.muted, spacing: 5 });

      // Participant
      doc.font('Regular').fontSize(12).fillColor(COLORS.muted).text('Certificamos que', 0, 205, { width: W, align: 'center' });
      const nameSize = this.fitFontSize(doc, 'Name', p.name, 34, W - 160);
      // A smaller name moves down so it stays the same distance from the red line.
      doc.font('Name').fontSize(nameSize).fillColor(COLORS.ink).text(p.name, 80, 222 + (34 - nameSize) * 0.9, { width: W - 160, align: 'center', lineBreak: false });
      doc.lineWidth(1).strokeColor(COLORS.red).moveTo(W / 2 - 150, 272).lineTo(W / 2 + 150, 272).stroke();

      // Event details
      const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
      const localEvento = ev.location.name.toLowerCase() !== 'outros'
        ? ev.location.name
        : (ev.customLocation ?? 'Local a definir');
      const bodyW = 600;

      this.centeredRichText(doc, [
        { font: 'Regular', text: 'participou do evento ' },
        { font: 'SemiBold', text: `“${ev.name}”` },
        { font: 'Regular', text: ', ministrado por ' },
        { font: 'SemiBold', text: ev.speakerName },
        { font: 'Regular', text: `, realizado em ${this.formatDateRange(ev.startDate, ev.endDate)}, das ${timeFormatter.format(ev.startTime)} às ${timeFormatter.format(ev.endTime)}, em ${localEvento}, promovido pela Faculdade de Tecnologia de Itu – Dom Amaury Castanho, com carga horária total de ` },
        // Non-breaking spaces keep the workload on a single line.
        { font: 'SemiBold', text: this.formatWorkload(ev.startTime, ev.endTime).replace(/ /g, '\u00A0') },
        { font: 'Regular', text: '.' },
      ], W / 2 - bodyW / 2, 292, bodyW, {
        color: COLORS.ink,
        // Long event, speaker or place names step down so the text never reaches the signature and QR code.
        maxLines: 4,
        sizes: [{ size: 12.5, lineHeight: 22 }, { size: 11.5, lineHeight: 19.5 }, { size: 10.5, lineHeight: 17.5 }],
      });

      // Coordinator signature
      const sigCenter = 250;
      const sigLineY = 470;
      const sigW = 150;
      doc.image(SIGNATURE_IMG, sigCenter - sigW / 2, sigLineY - 52, { width: sigW });
      doc.lineWidth(0.8).strokeColor(COLORS.ink).moveTo(sigCenter - 120, sigLineY).lineTo(sigCenter + 120, sigLineY).stroke();
      doc.font('SemiBold').fontSize(10.5).fillColor(COLORS.ink).text('Profa. Ma. Lucimar Canonico de Santi', sigCenter - 150, sigLineY + 7, { width: 300, align: 'center' });
      doc.font('Regular').fontSize(8.5).fillColor(COLORS.muted).text('Coordenadora do Curso Superior de Tecnologia em\nAnálise e Desenvolvimento de Sistemas', sigCenter - 150, sigLineY + 23, { width: 300, align: 'center', lineGap: 1 });

      // Verification QR code
      const qrSize = 88;
      const qrX = W - 205;
      const qrY = 398;
      const qrTextW = 140;
      const qrTextX = qrX - 20 - qrTextW;
      doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 8).lineWidth(0.8).fillAndStroke('#FFFFFF', COLORS.qrBorder);
      doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
      doc.font('SemiBold').fontSize(9.5).fillColor(COLORS.ink).text('Verifique a autenticidade', qrTextX, qrY + 18, { width: qrTextW, align: 'right' });
      doc.font('Regular').fontSize(8).fillColor(COLORS.muted).text('Aponte a câmera do celular para o QR Code e confira este certificado no site da Fatec Itu.', qrTextX, qrY + 34, { width: qrTextW, align: 'right', lineGap: 1 });

      doc.font('Medium').fontSize(8).fillColor(COLORS.muted).text('Faculdade de Tecnologia de Itu – Dom Amaury Castanho  ·  Centro Paula Souza  ·  Governo do Estado de São Paulo', 0, H - 58, { width: W, align: 'center', characterSpacing: 0.3 });

      doc.end();
    });
  }

  private formatWorkload(startTime: Date, endTime: Date): string {
    const totalMinutes = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [
      hours ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : null,
      minutes || !hours ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : null,
    ].filter(Boolean);
    return parts.join(' e ');
  }

  // characterSpacing also pads the last letter, so the text moves half a step right to stay centered.
  private spacedText(doc: PDFKit.PDFDocument, text: string, y: number, pageWidth: number, opts: { size: number; font: string; color: string; spacing: number }) {
    doc.font(opts.font).fontSize(opts.size).fillColor(opts.color).text(text, opts.spacing / 2, y, { width: pageWidth, align: 'center', characterSpacing: opts.spacing });
  }

  // Long names shrink instead of wrapping over the red line below them.
  private fitFontSize(doc: PDFKit.PDFDocument, font: string, text: string, maxSize: number, maxWidth: number): number {
    let size = maxSize;
    while (size > 18 && doc.font(font).fontSize(size).widthOfString(text) > maxWidth) size -= 1;
    return size;
  }

  // PDFKit can't center a paragraph that mixes fonts (continued: true), so lines are wrapped and centered by hand.
  // Only plain spaces break lines, so \u00A0 keeps a phrase together.
  // Uses the first size whose text fits in maxLines (or the smallest one).
  private centeredRichText(doc: PDFKit.PDFDocument, runs: TextRun[], x: number, y: number, width: number, opts: { color: string; maxLines: number; sizes: { size: number; lineHeight: number }[] }) {
    const words = runs.flatMap(run => run.text.split(/( +)/).filter(Boolean).map(text => ({ text, font: run.font })));
    const isSpace = (w: TextRun) => /^ +$/.test(w.text);

    const wrap = (size: number): TextRun[][] => {
      const measure = (w: TextRun) => doc.font(w.font).fontSize(size).widthOfString(w.text);
      const lines: TextRun[][] = [[]];
      let lineWidth = 0;
      for (const word of words) {
        const current = lines[lines.length - 1];
        const wordWidth = measure(word);
        if (!isSpace(word) && current.length && lineWidth + wordWidth > width) {
          lines.push([word]);
          lineWidth = wordWidth;
          continue;
        }
        if (isSpace(word) && !current.length) continue;
        current.push(word);
        lineWidth += wordWidth;
      }
      lines.forEach(line => { while (line.length && isSpace(line[line.length - 1])) line.pop(); });
      return lines;
    };

    const { size, lineHeight } = opts.sizes.find(s => wrap(s.size).length <= opts.maxLines) ?? opts.sizes[opts.sizes.length - 1];
    const measure = (w: TextRun) => doc.font(w.font).fontSize(size).widthOfString(w.text);

    wrap(size).forEach((line, i) => {
      let cursorX = x + (width - line.reduce((sum, w) => sum + measure(w), 0)) / 2;
      for (const word of line) {
        doc.font(word.font).fontSize(size).fillColor(opts.color).text(word.text, cursorX, y + i * lineHeight, { lineBreak: false });
        cursorX += measure(word);
      }
    });
  }

  private certificateMessageEmail(nome: string, evento: string): string {
    return `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
    <body style="margin:0;padding:0;width:100%;height:100%;background:#f5f7fb;font-family:Arial,sans-serif;color:#333;font-size:18px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;height:100%;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:8px;overflow:hidden;margin:40px 0;">
            <tr><td style="background:#b20000;padding:20px;text-align:center;">
              <h2 style="margin:0;font-size:20px;color:#fff;letter-spacing:1px;">Fatec Itu – Dom Amaury Castanho</h2>
              <p style="margin:5px 0 0;font-size:16px;color:#f8d7da;">Centro Paula Souza</p></td></tr>
            <tr><td style="padding:30px;">
              <h1 style="margin:0 0 20px;font-size:22px;color:#b20000;">Seu Certificado de Participação</h1>
              <p style="line-height:1.5;margin:0 0 15px;">Olá <strong>${nome}</strong>,</p>
              <p style="line-height:1.5;margin:0 0 30px;">Parabéns por participar do evento <strong>${evento}</strong>! Segue em anexo o seu certificado com verificação por QRCode.</p>
              <!-- Gmail and Outlook drop gradient backgrounds, which left white text on white: solid light box with red text instead. -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 30px;">
                <tr><td align="center" bgcolor="#fdecec" style="background-color:#fdecec;border:2px dashed #b20000;border-radius:6px;padding:20px;">
                  <span style="display:inline-block;font-size:18px;font-weight:bold;color:#b20000;">Certificado em anexo</span>
                </td></tr>
              </table>
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
