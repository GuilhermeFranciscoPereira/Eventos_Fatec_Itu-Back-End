import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let config: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    config = { getOrThrow: jest.fn(() => 'pepper') };
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService,  useValue: config },
      ],
    }).compile();

    service = mod.get(UsersService);
  });

  describe('Success paths', () => {
    it('findAll → returns sorted array', async () => {
      const now = new Date(), old = new Date(now.getTime()-1000);
      prisma.user.findMany.mockResolvedValue([
        { id:1,name:'a',email:'a',role:Role.AUXILIAR,createdAt:now,updatedAt:now },
        { id:2,name:'b',email:'b',role:Role.ADMIN,createdAt:old,updatedAt:old },
      ]);
      const out = await service.findAll();
      expect(out.map(u=>u.role)).toEqual([Role.ADMIN, Role.AUXILIAR]);
    });

    it('register → creates user', async () => {
      const dto = { name:'n', email:'e', password:'p', role:Role.COORDENADOR };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id:5,email:'e' });
      const out = await service.register(dto);
      expect(out).toEqual({ id:5, email:'e' });
      expect(argon2.hash).toHaveBeenCalledWith('ppepper', expect.any(Object));
    });

    it('update → updates existing', async () => {
      const dto = { name:'x' };
      prisma.user.findUnique.mockResolvedValue({ id:1 });
      prisma.user.update.mockResolvedValue({ id:1,name:'x',email:'e',role:'ADMIN',createdAt:new Date(),updatedAt:new Date() });
      const out = await service.update(1, dto as any);
      expect(out.name).toBe('x');
    });

    it('remove → deletes user and tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({ id:1 });
      prisma.$transaction.mockResolvedValue([{},{}]);
      const out = await service.remove(1);
      expect(out).toEqual({ message: 'Usuário removido com sucesso.' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where:{ userId:1 } });
    });
  });

  describe('Error paths', () => {
    it('register → conflict on existing email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id:1 });
      await expect(service.register({} as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('update → not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update(1, {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('remove → not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
