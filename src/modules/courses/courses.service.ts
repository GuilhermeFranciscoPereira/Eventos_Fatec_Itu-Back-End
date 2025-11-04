import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<CourseResponseDto[]> {
    return this.prisma.course.findMany({ orderBy: { name: 'asc' } })
  }

  async findAllPublic(): Promise<{ id: number; name: string }[]> {
    return this.prisma.course.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  async create(dto: CreateCourseDto): Promise<CourseResponseDto> {
    const exists = await this.prisma.course.findUnique({ where: { name: dto.name } })
    if (exists) throw new ConflictException(`Curso "${dto.name}" já existe.`)
    return this.prisma.course.create({ data: { name: dto.name } })
  }

  async update(id: number, dto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.prisma.course.findUnique({ where: { id } })
    if (!course) throw new NotFoundException(`Curso com id ${id} não encontrado.`)
    if (dto.name && dto.name !== course.name) {
      const clash = await this.prisma.course.findUnique({ where: { name: dto.name } })
      if (clash) throw new ConflictException(`Curso "${dto.name}" já existe.`)
    }
    return this.prisma.course.update({ where: { id }, data: dto })
  }

  async delete(id: number): Promise<{ message: string }> {
    const course = await this.prisma.course.findUnique({ where: { id } })
    if (!course) throw new NotFoundException(`Curso com id ${id} não encontrado.`)
    await this.prisma.course.delete({ where: { id } })
    return { message: 'Curso deletado com sucesso.' }
  }
}
