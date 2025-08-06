import { Course, Semester } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ParticipantsService - Unitary Test', () => {
  let service: ParticipantsService
  let prisma: any
  let emailService: any

  const validDto: CreateParticipantDto = {
    name: 'Fulano de Tal',
    email: 'fulano@fatec.sp.gov.br',
    course: Course.ADS,
    semester: Semester.SEMESTER1,
    ra: '1234567890123',
    eventId: 42,
  }

  const participant = {
    id: 1,
    ...validDto,
    isPresent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const event = {
    id: 42,
    name: 'Evento X',
    startDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    speakerName: 'Palestrante',
    location: 'AUDITORIO',
    customLocation: null,
  }

  beforeEach(async () => {
    prisma = {
      participant: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      event: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    }
    emailService = { send: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile()

    service = module.get(ParticipantsService)
  })

  describe('create', () => {
    it('throws if email already registered', async () => {
      prisma.participant.findFirst.mockResolvedValueOnce({})
      await expect(service.create(validDto as any)).rejects.toThrow(ConflictException)
    })

    it('throws if ra provided and email invalid', async () => {
      prisma.participant.findFirst.mockResolvedValue(null)
      await expect(
        service.create({ ...validDto, email: 'foo@gmail.com' } as any)
      ).rejects.toThrow(ConflictException)
    })

    it('throws if ra already registered', async () => {
      prisma.participant.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({})
      await expect(service.create(validDto as any)).rejects.toThrow(ConflictException)
    })

    it('increments event, creates participant and sends email', async () => {
      prisma.participant.findFirst.mockResolvedValue(null)
      prisma.event.update.mockResolvedValue(event)
      prisma.participant.create.mockResolvedValue(participant)
      prisma.event.findUnique.mockResolvedValue(event)

      const result = await service.create(validDto)

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { currentParticipants: { increment: 1 } },
      })
      expect(prisma.participant.create).toHaveBeenCalledWith({ data: validDto })
      expect(emailService.send).toHaveBeenCalledWith(
        validDto.email,
        'Confirmação de inscrição',
        expect.stringContaining('<!DOCTYPE html>')
      )
      expect(result).toBe(participant)
    })
  })

  describe('update', () => {
    it('throws if participant not found', async () => {
      prisma.participant.findUnique.mockResolvedValue(null)
      await expect(service.update(1, { isPresent: true })).rejects.toThrow(NotFoundException)
    })

    it('updates isPresent flag', async () => {
      prisma.participant.findUnique.mockResolvedValue(participant)
      prisma.participant.update.mockResolvedValue({ ...participant, isPresent: true })

      const updated = await service.update(1, { isPresent: true })
      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isPresent: true },
      })
      expect(updated.isPresent).toBe(true)
    })
  })
})
