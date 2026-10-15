import { Prisma, Semester } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ParticipantsService - Unitary Test', () => {
  let service: ParticipantsService
  let prisma: any
  let tx: any
  let emailService: any

  const validDto: CreateParticipantDto = {
    name: 'Fulano de Tal',
    email: 'fulano@fatec.sp.gov.br',
    courseId: 1,
    semester: Semester.SEMESTER1,
    ra: '0480482511001',
    eventId: 42,
  }

  const participant = {
    id: 1,
    ...validDto,
    isPresent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  const event = {
    id: 42,
    name: 'Evento X',
    description: 'Descrição',
    startDate: inOneYear,
    endDate: null,
    startTime: inOneYear,
    endTime: inOneYear,
    speakerName: 'Palestrante',
    location: { name: 'Auditório' },
    customLocation: null,
    isRestricted: false,
    semester: 'ALL',
    maxParticipants: 50,
    eventCourses: [],
  }

  beforeEach(async () => {
    tx = {
      event: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      participant: { create: jest.fn().mockResolvedValue(participant) },
    }
    prisma = {
      participant: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      event: {
        findUnique: jest.fn().mockResolvedValue(event),
      },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)),
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
      await expect(service.create(validDto)).rejects.toThrow(ConflictException)
    })

    it('throws if ra provided and email invalid', async () => {
      await expect(
        service.create({ ...validDto, email: 'foo@gmail.com' })
      ).rejects.toThrow(ConflictException)
    })

    it('throws if ra already registered', async () => {
      prisma.participant.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({})
      await expect(service.create(validDto)).rejects.toThrow(ConflictException)
    })

    it('throws if the event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null)
      await expect(service.create(validDto)).rejects.toThrow(NotFoundException)
    })

    it('rejects registrations after the event has ended', async () => {
      prisma.event.findUnique.mockResolvedValue({ ...event, endTime: new Date('2020-01-01T10:00:00.000Z') })
      await expect(service.create(validDto)).rejects.toThrow('As inscrições para este evento foram encerradas.')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('requires RA and institutional e-mail for a restricted event without courses', async () => {
      prisma.event.findUnique.mockResolvedValue({ ...event, isRestricted: true, eventCourses: [] })
      const outsider = { name: 'Visitante', email: 'visitante@gmail.com', eventId: 42 }
      await expect(service.create(outsider)).rejects.toThrow('Este evento é exclusivo para alunos da Fatec. Informe seu RA e seu e-mail institucional.')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('accepts a Fatec student in a restricted event without courses', async () => {
      prisma.event.findUnique.mockResolvedValue({ ...event, isRestricted: true, eventCourses: [] })
      await expect(service.create(validDto)).resolves.toBe(participant)
    })

    it('takes the seat and creates the participant in the same transaction, then sends the e-mail', async () => {
      const result = await service.create(validDto)

      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(tx.event.updateMany).toHaveBeenCalledWith({
        where: { id: 42, currentParticipants: { lt: 50 } },
        data: { currentParticipants: { increment: 1 } },
      })
      expect(tx.participant.create).toHaveBeenCalledWith({ data: validDto })
      expect(emailService.send).toHaveBeenCalledWith(
        validDto.email,
        'Confirmação de inscrição',
        expect.stringContaining('<!DOCTYPE html>')
      )
      expect(result).toBe(participant)
    })

    it('does not create the participant when the event is full', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 0 })
      await expect(service.create(validDto)).rejects.toThrow('Este evento já atingiu o limite de participantes')
      expect(tx.participant.create).not.toHaveBeenCalled()
    })

    it('answers 409 when the same e-mail registers twice at the same time', async () => {
      tx.participant.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }))
      await expect(service.create(validDto)).rejects.toThrow('Participante com este e-mail já inscrito neste evento.')
      expect(emailService.send).not.toHaveBeenCalled()
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
