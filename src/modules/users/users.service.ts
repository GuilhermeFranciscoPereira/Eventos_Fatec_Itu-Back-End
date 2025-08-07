import * as argon2 from 'argon2';
import { Role, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreateDto } from './dto/create-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly pepper: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService
  ) {
    this.pepper = this.config.getOrThrow<string>('PASSWORD_PEPPER');
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });

    const ROLE_PRIORITY: Record<Role, number> = { ADMIN: 1, COORDENADOR: 2, AUXILIAR: 3 };

    return users.sort((a, b) => {
      const diffRole = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
      if (diffRole !== 0) return diffRole;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async updatePersonalProfile(id: number, dto: UpdateUserDto, file?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    let imageUrl = user.imageUrl;

    if (file) {
      if (user.imageUrl) {
        const parts = user.imageUrl.split('/');
        const publicId = parts.slice(-2).join('/').split('.')[0];
        await this.cloudinary.deleteFile(publicId);
      }

      const uploadResult = await this.cloudinary.uploadFile(file);
      imageUrl = uploadResult.secure_url
    }

    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name ?? user.name, imageUrl },
      select: { id: true, name: true, email: true, role: true, imageUrl: true, createdAt: true, updatedAt: true },
    });
  }

  async create(dto: CreateDto) {
    const userExist = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (userExist) throw new ConflictException('E-mail já cadastrado!');

    const hash = await argon2.hash(dto.password + this.pepper, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash, role: dto.role, name: dto.name },
    });

    return { id: user.id, email: user.email };
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const userExist = await this.prisma.user.findUnique({ where: { id } });
    if (!userExist) { throw new NotFoundException(`Usuário com id ${id} não encontrado.`) };

    const data: Partial<User> = {};
    if (dto.name) data.name = dto.name;
    if (dto.email && dto.email !== userExist.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (clash) throw new ConflictException(`E-mail "${dto.email}" já está em uso por outro usuário.`);
      data.email = dto.email;
    }
    if (dto.role) data.role = dto.role as Role;
    if (dto.password) data.password = await argon2.hash(dto.password + this.pepper, { type: argon2.argon2id });

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });

    return user;
  }

  async delete(id: number): Promise<{ message: string }> {
    const userExist = await this.prisma.user.findUnique({ where: { id } });
    if (!userExist) { throw new NotFoundException(`Usuário com id ${id} não encontrado.`) };

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: 'Usuário removido com sucesso.' };
  }
}
