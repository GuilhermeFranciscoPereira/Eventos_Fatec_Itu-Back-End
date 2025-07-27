import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (exists) { throw new ConflictException(`Categoria ${dto.name} já existe.`) };
    return this.prisma.category.create({ data: { name: dto.name } });
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) { throw new NotFoundException(`Categoria com o ID ${id} não encontrada.`) }
    if (dto.name) {
      const clash = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Categoria com o nome ${dto.name} já existe.`);
      }
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(id: number): Promise<{ message: string }> {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) { throw new NotFoundException(`Categoria com o ID ${id} não encontrada.`) }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Categoria deletada com sucesso.' };
  }
}
