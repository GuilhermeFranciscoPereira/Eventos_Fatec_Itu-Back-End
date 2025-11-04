import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CourseResponseDto } from './dto/course-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, HttpCode } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Public()
  @Get('publicAllCourses')
  async findAllPublic(): Promise<{ id: number; name: string }[]> {
    return this.coursesService.findAllPublic()
  }

  @Get()
  async findAll(): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll()
  }

  @Post('create')
  @HttpCode(201)
  async create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto)
  }

  @Patch('patch/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.update(id, dto)
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.delete(id)
  }
}
