import { Location } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationPublicResponseDto } from './dto/location-public-response.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllPublic(): Promise<LocationPublicResponseDto[]> {
    return this.prisma.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(): Promise<Location[]> {
    return this.prisma.location.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    const exists = await this.prisma.location.findUnique({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException(`Local ${dto.name} já existe.`);
    }

    return this.prisma.location.create({
      data: { name: dto.name },
    });
  }

  async update(id: number, dto: UpdateLocationDto): Promise<Location> {
    const exists = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException(`Local com o ID ${id} não encontrado.`);
    }

    if (dto.name) {
      const clash = await this.prisma.location.findUnique({
        where: { name: dto.name },
      });

      if (clash && clash.id !== id) {
        throw new ConflictException(`Local com o nome ${dto.name} já existe.`);
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number): Promise<{ message: string }> {
    const exists = await this.prisma.location.findUnique({
      where: { id },
      include: { Event: { select: { id: true } } },
    });

    if (!exists) {
      throw new NotFoundException(`Local com o ID ${id} não encontrado.`);
    }

    if (exists.Event.length > 0) {
      throw new ConflictException('Este local está vinculado a um ou mais eventos e não pode ser deletado.');
    }

    await this.prisma.location.delete({
      where: { id },
    });

    return { message: 'Local deletado com sucesso.' };
  }
}