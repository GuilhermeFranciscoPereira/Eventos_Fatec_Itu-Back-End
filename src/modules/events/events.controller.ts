import { Role } from '@prisma/client';
import { EventsService } from './events.service';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventResponseDto } from './dto/event-response.dto';
import { ValidatePresenceDto } from './dto/validate-presence.dto';
import { EventPublicResponseDto } from './dto/event-public-response.dto';
import { FindEventsByParticipantEmailDto } from './dto/find-by-participant-email.dto';
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UploadedFile, UseGuards, UseInterceptors, HttpCode, ParseIntPipe } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('events')
@ApiTags('Events')
export class EventsController {
  constructor(private eventService: EventsService) { }

  @Public()
  @Get('publicAllEvents')
  @ApiOperation({ summary: 'Lista eventos públicos', description: 'Rota pública usada nas telas abertas da plataforma.' })
  @ApiOkResponse({ type: EventPublicResponseDto, isArray: true })
  async findAllPublic(): Promise<EventPublicResponseDto[]> {
    return this.eventService.findAllPublic();
  }

  @Roles(Role.ADMIN, Role.COORDENADOR, Role.AUXILIAR)
  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista eventos administrativos', description: 'Rota privada para ADMIN, COORDENADOR e AUXILIAR.' })
  @ApiOkResponse({ type: EventResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(): Promise<EventResponseDto[]> {
    return this.eventService.findAll();
  }

  @Public()
  @Get('public/by-participant-email')
  @ApiOperation({ summary: 'Lista eventos por e-mail do participante', description: 'Rota pública para consulta de eventos vinculados a uma inscrição.' })
  @ApiOkResponse({ type: EventPublicResponseDto, isArray: true })
  async findPublicByParticipantEmail(
    @Query() dto: FindEventsByParticipantEmailDto,
  ): Promise<EventPublicResponseDto[]> {
    return this.eventService.findPublicByParticipantEmail(dto.email);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Busca evento por ID', description: 'Rota pública para exibir detalhes de um evento.' })
  @ApiOkResponse({ type: EventResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventService.findOne(id);
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cria evento', description: 'Rota privada para ADMIN e COORDENADOR. Permite imagem, múltiplos cursos e evento em mais de um dia.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description', 'maxParticipants', 'isRestricted', 'locationId', 'speakerName', 'startDate', 'startTime', 'endTime'],
      properties: {
        name: { type: 'string', example: 'Hackathon Fatec Itu' },
        description: { type: 'string', example: 'Competição prática de desenvolvimento de soluções tecnológicas.' },
        courseId: { type: 'integer', example: 1, nullable: true },
        courseIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
        semester: { type: 'string', example: 'ALL' },
        maxParticipants: { type: 'integer', example: 100 },
        isRestricted: { type: 'boolean', example: true },
        locationId: { type: 'integer', example: 1 },
        customLocation: { type: 'string', example: 'Pátio central' },
        speakerName: { type: 'string', example: 'Prof. João Silva' },
        startDate: { type: 'string', format: 'date-time', example: '2026-06-29T00:00:00.000Z' },
        endDate: { type: 'string', format: 'date-time', example: '2026-07-03T00:00:00.000Z', nullable: true },
        startTime: { type: 'string', format: 'date-time', example: '2026-06-29T08:00:00.000Z' },
        endTime: { type: 'string', format: 'date-time', example: '2026-06-29T18:00:00.000Z' },
        duration: { type: 'integer', example: 480 },
        categoryId: { type: 'integer', example: 1 },
        presenceSecret: { type: 'string', example: 'presenca-hackathon', nullable: true },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: EventResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async create(@Body() dto: CreateEventDto, @UploadedFile() file: Express.Multer.File): Promise<EventResponseDto> {
    return this.eventService.create(dto, file);
  }

  @Patch('patch/:id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualiza evento', description: 'Rota privada para ADMIN e COORDENADOR. Permite alterar dados, imagem, cursos e data final.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Hackathon Fatec Itu' },
        description: { type: 'string', example: 'Competição prática de desenvolvimento de soluções tecnológicas.' },
        courseId: { type: 'integer', example: 1, nullable: true },
        courseIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
        semester: { type: 'string', example: 'ALL' },
        maxParticipants: { type: 'integer', example: 100 },
        isRestricted: { type: 'boolean', example: true },
        locationId: { type: 'integer', example: 1 },
        customLocation: { type: 'string', example: 'Pátio central' },
        speakerName: { type: 'string', example: 'Prof. João Silva' },
        startDate: { type: 'string', format: 'date-time', example: '2026-06-29T00:00:00.000Z' },
        endDate: { type: 'string', format: 'date-time', example: '2026-07-03T00:00:00.000Z', nullable: true },
        startTime: { type: 'string', format: 'date-time', example: '2026-06-29T08:00:00.000Z' },
        endTime: { type: 'string', format: 'date-time', example: '2026-06-29T18:00:00.000Z' },
        duration: { type: 'integer', example: 480 },
        categoryId: { type: 'integer', example: 1 },
        presenceSecret: { type: 'string', example: 'presenca-hackathon', nullable: true },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto, @UploadedFile() file?: Express.Multer.File): Promise<EventResponseDto> {
    return this.eventService.update(id, dto, file);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Remove evento', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ schema: { example: { message: 'Evento deletado com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.remove(id);
  }

  @Public()
  @Patch(':eventId/participants/:participantId/presence')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Confirma presença em evento', description: 'Rota pública. Valida a palavra secreta e marca o participante como presente.' })
  @ApiOkResponse({ schema: { example: { message: 'Presença confirmada com sucesso!' } } })
  async validatePresence(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('participantId', ParseIntPipe) participantId: number,
    @Body() dto: ValidatePresenceDto,
  ) {
    return this.eventService.validatePresence(eventId, participantId, dto);
  }

  @Get('availability/dates')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista datas disponíveis por local', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiQuery({ name: 'locationId', type: Number, example: 1 })
  @ApiOkResponse({ schema: { example: ['2026-06-30', '2026-07-01'] } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async availabilityDates(@Query('locationId', ParseIntPipe) locationId: number): Promise<string[]> {
    return this.eventService.getAvailableDates(locationId);
  }

  @Get('availability/times')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista horários disponíveis por local e data', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiQuery({ name: 'locationId', type: Number, example: 1 })
  @ApiQuery({ name: 'date', type: String, example: '2026-06-30' })
  @ApiQuery({ name: 'exceptId', required: false, type: String, example: '10' })
  @ApiOkResponse({ schema: { example: [{ start: '08:00', end: '09:00' }] } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async availabilityTimes(
    @Query('locationId', ParseIntPipe) locationId: number,
    @Query('date') date: string,
    @Query('exceptId') exceptId?: string,
  ): Promise<{ start: string; end: string }[]> {
    return this.eventService.getAvailableTimes(locationId, date, exceptId ? Number(exceptId) : undefined);
  }
}
