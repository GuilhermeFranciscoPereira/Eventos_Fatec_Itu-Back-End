import { Location } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EventPublicResponseDto } from './dto/event-public-response.dto';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) { }
  private readonly BUSINESS_START = '07:00';
  private readonly BUSINESS_END = '22:00';

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private fromMinutes(min: number): string {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }

  async findAllPublic(): Promise<EventPublicResponseDto[]> {
    return this.prisma.event.findMany({
      where: { startTime: { gt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000) } },
      select: { id: true, name: true, description: true, imageUrl: true, course: true, semester: true, maxParticipants: true, currentParticipants: true, isRestricted: true, location: true, customLocation: true, speakerName: true, startDate: true, startTime: true, endTime: true, duration: true, categoryId: true },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findAll() {
    return this.prisma.event.findMany({ orderBy: { startTime: 'asc' } });
  }

  async findOne(id: number) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw new NotFoundException(`Evento ${id} não encontrado.`);
    return e;
  }

  async create(dto: CreateEventDto, file: Express.Multer.File) {
    if (dto.location !== Location.OUTROS) {
      await this.checkOverlap(
        dto.location,
        dto.startDate,
        dto.startTime,
        dto.endTime,
      );
    }

    if (!file) throw new ConflictException('Imagem obrigatória.');
    const upload = await this.cloudinary.uploadFile(file);

    return this.prisma.event.create({
      data: { ...dto, imageUrl: upload.secure_url },
    });
  }

  async update(id: number, dto: UpdateEventDto, file?: Express.Multer.File) {
    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Evento ${id} não encontrado.`);

    const newLocation = dto.location ?? exists.location;
    const newEnd = dto.endTime ?? exists.endTime.toISOString().substr(11, 5);
    const newDate = dto.startDate ?? exists.startDate.toISOString().split('T')[0];
    const newStart = dto.startTime ?? exists.startTime.toISOString().substr(11, 5);

    if (newLocation !== Location.OUTROS && (dto.location !== undefined || dto.startDate !== undefined || dto.startTime !== undefined || dto.endTime !== undefined)) {
      await this.checkOverlap(newLocation, newDate, newStart, newEnd, id);
    }

    let imageUrl = exists.imageUrl;
    if (file) {
      const parts = exists.imageUrl.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(publicId);
      const up = await this.cloudinary.uploadFile(file);
      imageUrl = up.secure_url;
    }

    return this.prisma.event.update({
      where: { id },
      data: { ...dto, ...(file && { imageUrl }) },
    });
  }

  private async checkOverlap(location: Location, date: string, startTime: string, endTime: string, exceptId?: number) {
    const day = date.length > 10 ? date.substring(0, 10) : date;
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const dayEnd = new Date(`${day}T23:59:59.999Z`);
    const events = await this.prisma.event.findMany({
      where: {
        location,
        startDate: { gte: dayStart, lte: dayEnd },
        id: exceptId ? { not: exceptId } : undefined,
      },
    });

    const reqStart = this.toMinutes(startTime);
    const reqEnd = this.toMinutes(endTime);

    for (const e of events) {
      const eStart = this.toMinutes(e.startTime.toISOString().substr(11, 5));
      const eEnd = this.toMinutes(e.endTime.toISOString().substr(11, 5));
      const overlap = Math.max(reqStart, eStart) < Math.min(reqEnd, eEnd);
      if (overlap) throw new ConflictException(
        `Conflito com evento "${e.name}" de ${this.fromMinutes(eStart)} às ${this.fromMinutes(eEnd)} neste dia.`
      );
    }
  }

  async getAvailableDates(location: Location): Promise<string[]> {
    if (location === Location.OUTROS) return [];
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      if (await this.hasFreeSlot(location, dayStr)) dates.push(dayStr);
    }
    return dates;
  }

  private async hasFreeSlot(location: Location, date: string): Promise<boolean> {
    return (await this.getAvailableTimes(location, date)).length > 0;
  }

  async getAvailableTimes(location: Location, date: string, exceptId?: number): Promise<{ start: string; end: string }[]> {
    if (location === Location.OUTROS) return [{ start: this.BUSINESS_START, end: this.BUSINESS_END }];

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const events = await this.prisma.event.findMany({
      where: {
        location,
        startDate: { gte: dayStart, lte: dayEnd },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    const busy = events.map(e => {
      const eStart = this.toMinutes(e.startTime.toISOString().substr(11, 5));
      let eEnd = this.toMinutes(e.endTime.toISOString().substr(11, 5));
      const endDatePart = e.endTime.toISOString().split('T')[0];
      if (endDatePart !== date) { eEnd = this.toMinutes(this.BUSINESS_END) };
      return { start: eStart, end: eEnd };
    });

    const cursor = this.toMinutes(this.BUSINESS_START);
    const endAll = this.toMinutes(this.BUSINESS_END);
    const free: { start: string; end: string }[] = [];
    let current = cursor;

    for (const b of busy) {
      if (current < b.start) {
        free.push({ start: this.fromMinutes(current), end: this.fromMinutes(b.start) });
      }
      current = Math.max(current, b.end);
    }
    if (current < endAll) {
      free.push({ start: this.fromMinutes(current), end: this.fromMinutes(endAll) });
    }
    const filtered = free.filter(slot => {
      const dur = this.toMinutes(slot.end) - this.toMinutes(slot.start);
      return dur >= 30;
    });

    return filtered;
  }

  async remove(id: number) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw new NotFoundException(`Evento ${id} não encontrado.`);
    const parts = e.imageUrl.split('/');
    const publicId = parts.slice(-2).join('/').split('.')[0];
    await this.cloudinary.deleteFile(publicId);
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Evento deletado com sucesso.' };
  }
}
