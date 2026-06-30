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
import { ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('courses')
@ApiTags('Courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Public()
  @Get('publicAllCourses')
  @ApiOperation({ summary: 'Lista cursos públicos', description: 'Rota pública usada em telas de consulta e inscrição.' })
  @ApiOkResponse({ schema: { example: [{ id: 1, name: 'Análise e Desenvolvimento de Sistemas' }] } })
  async findAllPublic(): Promise<{ id: number; name: string }[]> {
    return this.coursesService.findAllPublic()
  }

  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista cursos administrativos', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll()
  }

  @Post('create')
  @HttpCode(201)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Cria curso', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiCreatedResponse({ type: CourseResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto)
  }

  @Patch('patch/:id')
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Atualiza curso', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.update(id, dto)
  }

  @Delete('delete/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Remove curso', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ schema: { example: { message: 'Curso deletado com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.delete(id)
  }
}
