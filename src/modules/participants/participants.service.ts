import { Participant, Event } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) { }

  async findByEvent(eventId: number): Promise<Participant[]> {
    return this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateParticipantDto): Promise<Participant> {
    const existsByEmail = await this.prisma.participant.findFirst({ where: { eventId: dto.eventId, email: dto.email } });
    if (existsByEmail) throw new ConflictException('Participante com este e-mail já inscrito neste evento.');
    if (dto.ra) {
      if (!dto.email.match(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/)) throw new ConflictException('E-mail deve ser institucional (@fatec.sp.gov.br ou @cms.sp.gov.br)');
      const existsByRa = await this.prisma.participant.findFirst({ where: { eventId: dto.eventId, ra: dto.ra } });
      if (existsByRa) throw new ConflictException('Participante com este RA já inscrito neste evento.');
    }

    await this.prisma.event.update({
      where: { id: dto.eventId },
      data: { currentParticipants: { increment: 1 } },
    });

    const participant = await this.prisma.participant.create({ data: dto });
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (event) {
      const html = this.buildConfirmationEmail(participant.name, event);
      await this.emailService.send(participant.email, 'Confirmação de inscrição', html);
    }
    return participant;
  }

  async update(id: number, dto: UpdateParticipantDto): Promise<Participant> {
    const participant = await this.prisma.participant.findUnique({ where: { id } });
    if (!participant) throw new NotFoundException(`Participante com id ${id} não encontrado.`);
    return this.prisma.participant.update({
      where: { id },
      data: { isPresent: dto.isPresent },
    });
  }

  private buildConfirmationEmail(name: string, event: Event): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Confirmação de Inscrição</title>
      </head>
      <body style="margin:0;padding:0;width:100%;background:#f5f7fb;font-family:Arial,sans-serif;color:#333;font-size:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;margin:40px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background:#b20000;padding:20px;text-align:center;">
                    <h2 style="margin:0;font-size:24px;color:#ffffff;letter-spacing:1px;">Fatec Itu – Dom Amaury Castanho</h2>
                    <p style="margin:5px 0 0;font-size:14px;color:#f8d7da;">Centro Paula Souza</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:30px;">
                    <h1 style="margin:0 0 20px;font-size:22px;color:#b20000;">Sua Inscrição Está Confirmada!</h1>
                    <p style="line-height:1.6;margin:0 0 20px;">Olá <strong>${name}</strong>,</p>
                    <p style="line-height:1.6;margin:0 0 20px;">
                      Estamos muito felizes por ter você conosco no <strong>${event.name}</strong>. Sua participação torna este evento ainda mais especial!
                    </p>
                    <p style="line-height:1.6;margin:0 0 20px;">
                      Aqui estão os detalhes para você se preparar:
                    </p>
                    <ul style="line-height:1.6;color:#555;font-size:16px; margin:0 0 20px; padding-left:20px;">
                      <li><strong>Data:</strong> ${new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</li>
                      <li><strong>Horário:</strong> ${event.startTime.toISOString().substr(11, 5)} às ${event.endTime.toISOString().substr(11, 5)}</li>
                      <li><strong>Palestrante:</strong> ${event.speakerName}</li>
                      <li><strong>Local:</strong> ${event.location !== 'OUTROS' ? event.location : event.customLocation}</li>
                      <li><strong>Descrição:</strong> ${event.description}</li>
                    </ul>
                    <p style="line-height:1.6;margin:0 0 20px;">Caso tenha alguma dúvida, <a href="mailto:contato@fatecitu.sp.gov.br" style="color:#b20000; text-decoration:none;">entre em contato conosco</a>. Será um prazer ajudar!</p>
                    <p style="line-height:1.6;margin:0 0 30px;">
                      Não esqueça de adicionar este evento ao seu calendário para não perder nenhum momento. Estamos preparando uma experiência incrível para você!
                    </p>
                    <hr style="border:none;border-top:1px solid #eaeaea;margin:30px 0;" />
                    <p style="line-height:1.6;margin:0 0 20px; font-size:14px; color:#777;">
                      Até breve e aproveite ao máximo! 🎉
                    </p>
                    <p style="font-size:12px;color:#aaa;">© ${new Date().getFullYear()} Fatec Itu – Dom Amaury Castanho. Todos os direitos reservados.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;
  }
}
