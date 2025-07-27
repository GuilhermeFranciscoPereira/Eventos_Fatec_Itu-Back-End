import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService - Unitary Test', () => {
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
      refreshToken: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    config = {
      getOrThrow: jest.fn().mockReturnValue('pepper'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('should return users sorted by role priority then createdAt desc', async () => {
      const users = [
        { id: 1, name: 'A', email: 'a', role: Role.AUXILIAR, createdAt: new Date(2), updatedAt: new Date(2) },
        { id: 2, name: 'B', email: 'b', role: Role.ADMIN, createdAt: new Date(1), updatedAt: new Date(1) },
        { id: 3, name: 'C', email: 'c', role: Role.ADMIN, createdAt: new Date(3), updatedAt: new Date(3) },
      ];
      prisma.user.findMany.mockResolvedValue(users);
      const result = await service.findAll();
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
      expect(result.map(u => u.id)).toEqual([3, 2, 1]);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.create({ email: 'e', password: 'P1$', role: Role.AUXILIAR, name: 'N' }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it('should create and return id and email when valid', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      jest.spyOn(argon2, 'hash').mockResolvedValue('hash');
      prisma.user.create.mockResolvedValue({ id: 5, email: 'e' });
      const result = await service.create({ email: 'e', password: 'P1$', role: Role.COORDENADOR, name: 'N' });
      expect(argon2.hash).toHaveBeenCalledWith('P1$pepper', { type: argon2.argon2id });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'e', password: 'hash', role: Role.COORDENADOR, name: 'N' },
      });
      expect(result).toEqual({ id: 5, email: 'e' });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update(10, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update name and return updated user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2 });
      const updatedUser = { id: 2, name: 'Y', email: 'y', role: Role.ADMIN, createdAt: new Date(), updatedAt: new Date() };
      prisma.user.update.mockResolvedValue(updatedUser);
      const result = await service.update(2, { name: 'Y' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { name: 'Y' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should hash password when provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 3 });
      jest.spyOn(argon2, 'hash').mockResolvedValue('newHash');
      const updatedUser = { id: 3, name: 'N', email: 'n', role: Role.AUXILIAR, createdAt: new Date(), updatedAt: new Date() };
      prisma.user.update.mockResolvedValue(updatedUser);
      const dto = { password: 'Ab1$' };
      const result = await service.update(3, dto);
      expect(argon2.hash).toHaveBeenCalledWith('Ab1$pepper', { type: argon2.argon2id });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { password: 'newHash' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.delete(9)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should delete refresh tokens and user, then return message', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 4 });
      prisma.$transaction.mockResolvedValue([{}, {}]);
      const result = await service.delete(4);
      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.refreshToken.deleteMany({ where: { userId: 4 } }),
        prisma.user.delete({ where: { id: 4 } }),
      ]);
      expect(result).toEqual({ message: 'Usuário removido com sucesso.' });
    });
  });
});
