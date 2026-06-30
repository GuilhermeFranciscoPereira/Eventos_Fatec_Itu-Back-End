import { Role } from '@prisma/client';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { ParticipantsService } from './participants.service';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ParticipantResponseDto } from './dto/participant-response.dto';
import { Controller, Post, Body, Get, Param, Patch, UseGuards, HttpCode, ParseIntPipe } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR, Role.AUXILIAR)
@Controller('participants')
@ApiTags('Participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) { }

  @Get('event/:id')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista participantes por evento', description: 'Rota privada para ADMIN, COORDENADOR e AUXILIAR.' })
  @ApiOkResponse({ type: ParticipantResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findByEvent(@Param('id', ParseIntPipe) eventId: number): Promise<ParticipantResponseDto[]> {
    return this.participantsService.findByEvent(eventId);
  }

  @Public()
  @Post('create')
  @HttpCode(201)
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Inscreve participante', description: 'Rota pública usada para inscrição em um evento.' })
  @ApiCreatedResponse({ type: ParticipantResponseDto })
  async create(@Body() dto: CreateParticipantDto): Promise<ParticipantResponseDto> {
    return this.participantsService.create(dto);
  }

  @Patch('patch/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Atualiza presença do participante', description: 'Rota privada para ADMIN, COORDENADOR e AUXILIAR.' })
  @ApiOkResponse({ type: ParticipantResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateParticipantDto): Promise<ParticipantResponseDto> {
    return this.participantsService.update(id, dto);
  }
}
