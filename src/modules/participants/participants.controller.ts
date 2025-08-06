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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR, Role.AUXILIAR)
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) { }

  @Get('event/:id')
  async findByEvent(@Param('id', ParseIntPipe) eventId: number): Promise<ParticipantResponseDto[]> {
    return this.participantsService.findByEvent(eventId);
  }

  @Public()
  @Post('create')
  @HttpCode(201)
  async create(@Body() dto: CreateParticipantDto): Promise<ParticipantResponseDto> {
    return this.participantsService.create(dto);
  }

  @Patch('patch/:id')
  @HttpCode(200)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateParticipantDto): Promise<ParticipantResponseDto> {
    return this.participantsService.update(id, dto);
  }
}
