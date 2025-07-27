import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Test, TestingModule } from '@nestjs/testing';

describe('UsersController - Unitary Test', () => {
  let controller: UsersController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();
    controller = module.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [{ id: 1, name: 'A', email: 'a', role: Role.ADMIN, createdAt: new Date(), updatedAt: new Date() }];
      service.findAll.mockResolvedValue(users);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('create', () => {
    it('should call service.create and return its result', async () => {
      const dto = { email: 'e', password: 'P1$', role: Role.AUXILIAR, name: 'N' };
      service.create.mockResolvedValue({ id: 2, email: 'e' });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 2, email: 'e' });
    });
  });

  describe('update', () => {
    it('should call service.update and return updated user', async () => {
      const dto = { name: 'X' };
      const updated = { id: 3, name: 'X', email: 'x', role: Role.COORDENADOR, createdAt: new Date(), updatedAt: new Date() };
      service.update.mockResolvedValue(updated);
      const result = await controller.update(3, dto);
      expect(service.update).toHaveBeenCalledWith(3, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should call service.delete and return message', async () => {
      service.delete.mockResolvedValue({ message: 'OK' });
      const result = await controller.delete(5);
      expect(service.delete).toHaveBeenCalledWith(5);
      expect(result).toEqual({ message: 'OK' });
    });
  });
});
