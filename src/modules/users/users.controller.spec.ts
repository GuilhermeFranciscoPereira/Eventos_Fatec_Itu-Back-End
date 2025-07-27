import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { RolesGuard } from '../../guards/roles.guard';
import { UsersController } from './users.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateDto } from './dto/create-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;
  let req: any;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      register: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(UsersController);
    service = moduleRef.get(UsersService) as any;

    req = { user: { userId: 1, role: 'ADMIN' } };
  });

  afterAll(() => { /* nothing */ });

  describe('Success paths', () => {
    it('findAll → should return array of users', async () => {
      const arr = [{ id: 1, name: 'A', email: 'a', role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() }];
      service.findAll.mockResolvedValue(arr as any);
      await expect(controller.findAll()).resolves.toBe(arr);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('register → should call service.register and return id/email', async () => {
      const dto: CreateDto = { name: 'X', email: 'x@fatec.sp.gov.br', password: 'P@ss1!', role: 'AUXILIAR' };
      service.create.mockResolvedValue({ id: 42, email: dto.email });
      await expect(controller.create(dto)).resolves.toEqual({ id: 42, email: dto.email });
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('update → should update and return updated user', async () => {
      const dto: UpdateUserDto = { name: 'Y' };
      const out = { id: 1, name: 'Y', email: 'e', role: 'COORDENADOR', createdAt: new Date(), updatedAt: new Date() };
      service.update.mockResolvedValue(out as any);
      await expect(controller.update(1, dto)).resolves.toBe(out);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('remove → should delete and return message', async () => {
      service.delete.mockResolvedValue({ message: 'ok' });
      await expect(controller.delete(1)).resolves.toEqual({ message: 'ok' });
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('Error paths', () => {
    it('update → NotFoundException bubbles up', async () => {
      service.update.mockRejectedValue(new NotFoundException('no'));
      await expect(controller.update(999, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('remove → NotFoundException bubbles up', async () => {
      service.delete.mockRejectedValue(new NotFoundException('no'));
      await expect(controller.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
