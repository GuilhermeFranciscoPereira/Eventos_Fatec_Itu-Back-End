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
    const rows = await this.prisma.event.findMany({
      where: {
        startTime: { gt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000) },
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        courseId: true,
        course: { select: { name: true } },
        semester: true,
        maxParticipants: true,
        currentParticipants: true,
        isRestricted: true,
        locationId: true,
        location: { select: { name: true } },
        customLocation: true,
        speakerName: true,
        startDate: true,
        startTime: true,
        endTime: true,
        duration: true,
        categoryId: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return rows
      .filter(e => e.currentParticipants < e.maxParticipants)
      .map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        imageUrl: e.imageUrl,
        courseId: e.courseId,
        courseName: e.course?.name ?? null,
        semester: e.semester,
        maxParticipants: e.maxParticipants,
        currentParticipants: e.currentParticipants,
        isRestricted: e.isRestricted,
        locationId: e.locationId,
        locationName: e.location.name,
        customLocation: e.customLocation,
        speakerName: e.speakerName,
        startDate: e.startDate,
        startTime: e.startTime,
        endTime: e.endTime,
        duration: e.duration,
        categoryId: e.categoryId,
      }));
  }

  async findAll() {
    const rows = await this.prisma.event.findMany({
      include: {
        location: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return rows.map(e => ({
      ...e,
      locationName: e.location.name,
    }));
  }

  async findOne(id: number) {
    const e = await this.prisma.event.findUnique({
      where: { id },
      include: {
        participants: true,
        course: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    if (!e) throw new NotFoundException(`Evento ${id} não encontrado.`);

    return {
      ...e,
      courseName: e.course?.name ?? null,
      locationName: e.location.name,
    };
  }

  async create(dto: CreateEventDto, file: Express.Multer.File) {
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Local com o ID ${dto.locationId} não encontrado.`);
    }

    const isOtherLocation = location.name.toLowerCase() === 'outros';

    if (!isOtherLocation) {
      await this.checkOverlap(
        dto.locationId,
        dto.startDate,
        dto.startTime,
        dto.endTime,
      );
    }

    if (!file) throw new ConflictException('Imagem obrigatória.');

    const upload = await this.cloudinary.uploadFile(file);

    const created = await this.prisma.event.create({
      data: {
        ...dto,
        customLocation: isOtherLocation ? dto.customLocation ?? null : null,
        imageUrl: upload.secure_url,
      },
      include: {
        location: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    return {
      ...created,
      courseName: created.course?.name ?? null,
      locationName: created.location.name,
    };
  }

  async update(id: number, dto: UpdateEventDto, file?: Express.Multer.File) {
    const exists = await this.prisma.event.findUnique({
      where: { id },
      include: {
        location: { select: { name: true } },
      },
    });

    if (!exists) throw new NotFoundException(`Evento ${id} não encontrado.`);

    const newLocationId = dto.locationId ?? exists.locationId;

    const location = await this.prisma.location.findUnique({
      where: { id: newLocationId },
    });

    if (!location) {
      throw new NotFoundException(`Local com o ID ${newLocationId} não encontrado.`);
    }

    const isOtherLocation = location.name.toLowerCase() === 'outros';

    const newDate = dto.startDate
      ? dto.startDate.substring(0, 10)
      : exists.startDate.toISOString().split('T')[0];

    const newStart = dto.startTime
      ? dto.startTime.substring(11, 16)
      : exists.startTime.toISOString().substring(11, 16);

    const newEnd = dto.endTime
      ? dto.endTime.substring(11, 16)
      : exists.endTime.toISOString().substring(11, 16);

    if (
      !isOtherLocation &&
      (
        dto.locationId !== undefined ||
        dto.startDate !== undefined ||
        dto.startTime !== undefined ||
        dto.endTime !== undefined
      )
    ) {
      await this.checkOverlap(newLocationId, newDate, newStart, newEnd, id);
    }

    let imageUrl = exists.imageUrl;

    if (file) {
      const parts = exists.imageUrl.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(publicId);
      const up = await this.cloudinary.uploadFile(file);
      imageUrl = up.secure_url;
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        customLocation: isOtherLocation
          ? dto.customLocation ?? exists.customLocation ?? null
          : null,
        ...(file ? { imageUrl } : {}),
      },
      include: {
        location: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    return {
      ...updated,
      courseName: updated.course?.name ?? null,
      locationName: updated.location.name,
    };
  }

  private async checkOverlap(locationId: number, date: string, startTime: string, endTime: string, exceptId?: number) {
    const day = date.length > 10 ? date.substring(0, 10) : date;
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const dayEnd = new Date(`${day}T23:59:59.999Z`);
    const events = await this.prisma.event.findMany({
      where: {
        locationId,
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

  async getAvailableDates(locationId: number): Promise<string[]> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Local com o ID ${locationId} não encontrado.`);
    }

    if (location.name.toLowerCase() === 'outros') return [];

    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];

      if (await this.hasFreeSlot(locationId, dayStr)) {
        dates.push(dayStr);
      }
    }

    return dates;
  }

  private async hasFreeSlot(locationId: number, date: string): Promise<boolean> {
    return (await this.getAvailableTimes(locationId, date)).length > 0;
  }

  async getAvailableTimes(locationId: number, date: string, exceptId?: number): Promise<{ start: string; end: string }[]> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Local com o ID ${locationId} não encontrado.`);
    }

    if (location.name.toLowerCase() === 'outros') {
      return [{ start: this.BUSINESS_START, end: this.BUSINESS_END }];
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const events = await this.prisma.event.findMany({
      where: {
        locationId,
        startDate: { gte: dayStart, lte: dayEnd },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    const busy = events.map(e => {
      const eStart = this.toMinutes(e.startTime.toISOString().substring(11, 16));
      let eEnd = this.toMinutes(e.endTime.toISOString().substring(11, 16));
      const endDatePart = e.endTime.toISOString().split('T')[0];

      if (endDatePart !== date) {
        eEnd = this.toMinutes(this.BUSINESS_END);
      }

      return { start: eStart, end: eEnd };
    });

    const endAll = this.toMinutes(this.BUSINESS_END);
    const free: { start: string; end: string }[] = [];
    let current = this.toMinutes(this.BUSINESS_START);

    for (const b of busy) {
      if (current < b.start) {
        free.push({
          start: this.fromMinutes(current),
          end: this.fromMinutes(b.start),
        });
      }

      current = Math.max(current, b.end);
    }

    if (current < endAll) {
      free.push({
        start: this.fromMinutes(current),
        end: this.fromMinutes(endAll),
      });
    }

    return free.filter(slot => {
      const dur = this.toMinutes(slot.end) - this.toMinutes(slot.start);
      return dur >= 30;
    });
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
