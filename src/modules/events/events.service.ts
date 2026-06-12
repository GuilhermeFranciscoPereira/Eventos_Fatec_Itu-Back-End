import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ValidatePresenceDto } from './dto/validate-presence.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EventPublicResponseDto } from './dto/event-public-response.dto';
import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

type EventCourseSummary = {
  course: {
    id: number;
    name: string;
  };
};

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

  private getCourseSummary(eventCourses: EventCourseSummary[]) {
    const courses = eventCourses.map(({ course }) => course);

    return {
      courseId: courses[0]?.id ?? null,
      courseName: courses[0]?.name ?? null,
      courseIds: courses.map(({ id }) => id),
      courseNames: courses.map(({ name }) => name),
    };
  }

  private getRequestedCourseIds(dto: Pick<CreateEventDto, 'courseId' | 'courseIds'>): number[] {
    const requested = dto.courseIds ?? (dto.courseId ? [dto.courseId] : []);

    return Array.from(new Set(requested));
  }

  private async assertCoursesExist(courseIds: number[]) {
    if (!courseIds.length) return;

    const count = await this.prisma.course.count({
      where: {
        id: {
          in: courseIds,
        },
      },
    });

    if (count !== courseIds.length) {
      throw new NotFoundException('Um ou mais cursos selecionados não foram encontrados.');
    }
  }

  private getDatePart(value: string | Date): string {
    return value instanceof Date
      ? value.toISOString().split('T')[0]
      : value.substring(0, 10);
  }

  private getTimePart(value: string | Date): string {
    return value instanceof Date
      ? value.toISOString().substring(11, 16)
      : value.includes('T')
        ? value.substring(11, 16)
        : value.substring(0, 5);
  }

  private combineDateAndTime(date: string | Date, time: string | Date): Date {
    return new Date(`${this.getDatePart(date)}T${this.getTimePart(time)}:00.000Z`);
  }

  private getEffectiveEndDate(startDate: string | Date, endDate?: string | Date | null): string {
    return endDate ? this.getDatePart(endDate) : this.getDatePart(startDate);
  }

  private assertValidDateRange(startDate: string | Date, endDate: string | Date | null | undefined, startTime: string | Date, endTime: string | Date) {
    const startsAt = this.combineDateAndTime(startDate, startTime);
    const endsAt = this.combineDateAndTime(this.getEffectiveEndDate(startDate, endDate), endTime);

    if (endsAt <= startsAt) {
      throw new ConflictException('A data e horÃ¡rio de fim devem ser posteriores ao inÃ­cio do evento.');
    }
  }

  async findAllPublic(): Promise<EventPublicResponseDto[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        endTime: { gt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000) },
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
        semester: true,
        maxParticipants: true,
        currentParticipants: true,
        isRestricted: true,
        locationId: true,
        location: { select: { name: true } },
        customLocation: true,
        speakerName: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        duration: true,
        categoryId: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return rows
      .filter(e => e.currentParticipants < e.maxParticipants)
      .map(e => {
        const courseSummary = this.getCourseSummary(e.eventCourses);

        return {
          id: e.id,
          name: e.name,
          description: e.description,
          imageUrl: e.imageUrl,
          ...courseSummary,
          semester: e.semester,
          maxParticipants: e.maxParticipants,
          currentParticipants: e.currentParticipants,
          isRestricted: e.isRestricted,
          locationId: e.locationId,
          locationName: e.location.name,
          customLocation: e.customLocation,
          speakerName: e.speakerName,
          startDate: e.startDate,
          endDate: e.endDate,
          startTime: e.startTime,
          endTime: e.endTime,
          duration: e.duration,
          categoryId: e.categoryId,
        };
      });
  }

  async findAll() {
    const rows = await this.prisma.event.findMany({
      include: {
        location: { select: { name: true } },
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return rows.map(({ location, eventCourses, ...e }) => ({
      ...e,
      ...this.getCourseSummary(eventCourses),
      locationName: location.name,
    }));
  }

  async findOne(id: number) {
    const e = await this.prisma.event.findUnique({
      where: { id },
      include: {
        participants: true,
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
        location: { select: { name: true } },
      },
    });

    if (!e) throw new NotFoundException(`Evento ${id} não encontrado.`);

    const { location, eventCourses, ...event } = e;

    return {
      ...event,
      ...this.getCourseSummary(eventCourses),
      locationName: location.name,
    };
  }

  async findPublicByParticipantEmail(email: string): Promise<EventPublicResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        endTime: {
          gte: new Date(),
        },
        participants: {
          some: {
            email,
          },
        },
      },
      include: {
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
        location: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      imageUrl: event.imageUrl,
      ...this.getCourseSummary(event.eventCourses),
      semester: event.semester,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      isRestricted: event.isRestricted,
      locationId: event.locationId,
      locationName: event.location.name,
      customLocation: event.customLocation,
      speakerName: event.speakerName,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      duration: event.duration,
      categoryId: event.categoryId,
    }));
  }

  async create(dto: CreateEventDto, file: Express.Multer.File) {
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Local com o ID ${dto.locationId} não encontrado.`);
    }

    const isOtherLocation = location.name.toLowerCase() === 'outros';

    this.assertValidDateRange(dto.startDate, dto.endDate, dto.startTime, dto.endTime);
    const effectiveEndDate = this.getEffectiveEndDate(dto.startDate, dto.endDate);
    const normalizedStartTime = `${this.getDatePart(dto.startDate)}T${this.getTimePart(dto.startTime)}:00.000Z`;
    const normalizedEndTime = `${effectiveEndDate}T${this.getTimePart(dto.endTime)}:00.000Z`;

    if (!isOtherLocation) {
      await this.checkOverlap(
        dto.locationId,
        dto.startDate,
        dto.endDate,
        dto.startTime,
        dto.endTime,
      );
    }

    if (!file) throw new ConflictException('Imagem obrigatória.');

    const courseIds = this.getRequestedCourseIds(dto);
    await this.assertCoursesExist(courseIds);

    const upload = await this.cloudinary.uploadFile(file);

    const presenceSecret = dto.presenceSecret?.trim() || null;

    const created = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description,
        eventCourses: courseIds.length
          ? {
            create: courseIds.map(courseId => ({
              course: {
                connect: { id: courseId },
              },
            })),
          }
          : undefined,
        semester: courseIds.length ? dto.semester : 'ALL',
        maxParticipants: dto.maxParticipants,
        isRestricted: courseIds.length ? true : dto.isRestricted,
        locationId: dto.locationId,
        customLocation: isOtherLocation ? dto.customLocation ?? null : null,
        speakerName: dto.speakerName,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        duration: dto.duration,
        categoryId: dto.categoryId,
        presenceSecret,
        imageUrl: upload.secure_url,
      },
      include: {
        location: { select: { name: true } },
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
      },
    });

    const { location: createdLocation, eventCourses, ...event } = created;

    return {
      ...event,
      ...this.getCourseSummary(eventCourses),
      locationName: createdLocation.name,
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

    const newEndDate = dto.endDate === undefined
      ? exists.endDate?.toISOString().split('T')[0] ?? null
      : dto.endDate
        ? dto.endDate.substring(0, 10)
        : null;

    const newStart = dto.startTime
      ? dto.startTime.substring(11, 16)
      : exists.startTime.toISOString().substring(11, 16);

    const newEnd = dto.endTime
      ? dto.endTime.substring(11, 16)
      : exists.endTime.toISOString().substring(11, 16);

    this.assertValidDateRange(newDate, newEndDate, newStart, newEnd);
    const normalizedStartTime = `${newDate}T${newStart}:00.000Z`;
    const normalizedEndTime = `${this.getEffectiveEndDate(newDate, newEndDate)}T${newEnd}:00.000Z`;

    if (
      !isOtherLocation &&
      (
        dto.locationId !== undefined ||
        dto.startDate !== undefined ||
        dto.endDate !== undefined ||
        dto.startTime !== undefined ||
        dto.endTime !== undefined
      )
    ) {
      await this.checkOverlap(newLocationId, newDate, newEndDate, newStart, newEnd, id);
    }

    let imageUrl = exists.imageUrl;

    if (file) {
      const parts = exists.imageUrl.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(publicId);
      const up = await this.cloudinary.uploadFile(file);
      imageUrl = up.secure_url;
    }

    const presenceSecret = dto.presenceSecret?.trim() || null;
    const shouldUpdateCourses = dto.courseIds !== undefined || dto.courseId !== undefined;
    const courseIds = this.getRequestedCourseIds(dto);

    if (shouldUpdateCourses) {
      await this.assertCoursesExist(courseIds);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        eventCourses: shouldUpdateCourses
          ? {
            deleteMany: {},
            create: courseIds.map(courseId => ({
              course: {
                connect: { id: courseId },
              },
            })),
          }
          : undefined,
        semester: shouldUpdateCourses && !courseIds.length ? 'ALL' : dto.semester,
        maxParticipants: dto.maxParticipants,
        isRestricted: shouldUpdateCourses && courseIds.length ? true : dto.isRestricted,
        locationId: dto.locationId,
        customLocation: isOtherLocation
          ? dto.customLocation ?? exists.customLocation ?? null
          : null,
        speakerName: dto.speakerName,
        startDate: dto.startDate,
        endDate: dto.endDate === undefined ? undefined : dto.endDate,
        startTime: dto.startTime !== undefined || dto.startDate !== undefined ? normalizedStartTime : undefined,
        endTime: dto.endTime !== undefined || dto.endDate !== undefined || dto.startDate !== undefined ? normalizedEndTime : undefined,
        duration: dto.duration,
        categoryId: dto.categoryId,
        imageUrl: file ? imageUrl : undefined,
        presenceSecret
      },
      include: {
        location: { select: { name: true } },
        eventCourses: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
      },
    });

    const { location: updatedLocation, eventCourses, ...event } = updated;

    return {
      ...event,
      ...this.getCourseSummary(eventCourses),
      locationName: updatedLocation.name,
    };
  }

  async validatePresence(
    eventId: number,
    participantId: number,
    dto: ValidatePresenceDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        presenceSecret: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (!event.presenceSecret) {
      throw new BadRequestException('Este evento não possui validação por palavra secreta');
    }

    const presenceSecret = dto.presenceSecret.trim();

    if (event.presenceSecret !== presenceSecret) {
      throw new ForbiddenException('Palavra secreta inválida');
    }

    const participant = await this.prisma.participant.findFirst({
      where: {
        id: participantId,
        eventId,
      },
      select: {
        id: true,
        isPresent: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participante não encontrado neste evento');
    }

    if (participant.isPresent) {
      return {
        message: 'Presença já confirmada',
        isPresent: true,
      };
    }

    await this.prisma.participant.update({
      where: { id: participantId },
      data: {
        isPresent: true,
      },
    });

    return {
      message: 'Presença confirmada com sucesso',
      isPresent: true,
    };
  }

  private async checkOverlap(locationId: number, startDate: string, endDate: string | null | undefined, startTime: string, endTime: string, exceptId?: number) {
    const startDay = this.getDatePart(startDate);
    const endDay = this.getEffectiveEndDate(startDate, endDate);
    const rangeStart = new Date(`${startDay}T00:00:00.000Z`);
    const rangeEnd = new Date(`${endDay}T23:59:59.999Z`);
    const events = await this.prisma.event.findMany({
      where: {
        locationId,
        startDate: { lte: rangeEnd },
        OR: [
          { endDate: { gte: rangeStart } },
          {
            endDate: null,
            startDate: { gte: rangeStart },
          },
        ],
        id: exceptId ? { not: exceptId } : undefined,
      },
    });

    const reqStart = this.combineDateAndTime(startDay, startTime);
    const reqEnd = this.combineDateAndTime(endDay, endTime);

    for (const e of events) {
      const eStartDay = this.getDatePart(e.startDate);
      const eEndDay = this.getEffectiveEndDate(e.startDate, e.endDate);
      const eStart = this.combineDateAndTime(eStartDay, e.startTime);
      const eEnd = this.combineDateAndTime(eEndDay, e.endTime);
      const overlap = reqStart < eEnd && eStart < reqEnd;
      if (overlap) throw new ConflictException(
        `Conflito com evento "${e.name}" neste período.`
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
        startDate: { lte: dayEnd },
        OR: [
          { endDate: { gte: dayStart } },
          {
            endDate: null,
            startDate: { gte: dayStart },
          },
        ],
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    const busy = events.map(e => {
      const startDatePart = this.getDatePart(e.startDate);
      const endDatePart = this.getEffectiveEndDate(e.startDate, e.endDate);
      const eStart = startDatePart === date
        ? this.toMinutes(this.getTimePart(e.startTime))
        : this.toMinutes(this.BUSINESS_START);
      const eEnd = endDatePart === date
        ? this.toMinutes(this.getTimePart(e.endTime))
        : this.toMinutes(this.BUSINESS_END);

      return { start: eStart, end: eEnd };
    });

    busy.sort((a, b) => a.start - b.start);

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
