import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';

describe('ParticipantsController - Unitary Test', () => {
  let controller: ParticipantsController
  let service: any

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipantsController],
      providers: [{ provide: ParticipantsService, useValue: service }],
    }).compile()
    controller = module.get(ParticipantsController)
  })

  it('create calls service.create', async () => {
    const dto = { name: 'A', email: 'a@b', eventId: 1 } as any
    service.create.mockResolvedValue('r')
    await expect(controller.create(dto)).resolves.toBe('r')
    expect(service.create).toHaveBeenCalledWith(dto)
  })

  it('update calls service.update', async () => {
    const dto = { isPresent: true }
    service.update.mockResolvedValue('u')
    await expect(controller.update(3, dto)).resolves.toBe('u')
    expect(service.update).toHaveBeenCalledWith(3, dto)
  })
})
