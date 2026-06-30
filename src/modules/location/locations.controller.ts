import { Role } from '@prisma/client';
import { RolesGuard } from '../../guards/roles.guard';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { LocationPublicResponseDto } from './dto/location-public-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, HttpCode } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('locations')
@ApiTags('Locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) { }

  @Public()
  @Get('publicAllLocations')
  @ApiOperation({ summary: 'Lista locais públicos', description: 'Rota pública usada em telas de consulta e inscrição.' })
  @ApiOkResponse({ type: LocationPublicResponseDto, isArray: true })
  async findAllPublic(): Promise<LocationPublicResponseDto[]> {
    return this.locationsService.findAllPublic();
  }

  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista locais administrativos', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ type: LocationResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll();
  }

  @Post('create')
  @HttpCode(201)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Cria local', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiCreatedResponse({ type: LocationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async create(@Body() dto: CreateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.create(dto);
  }

  @Patch('patch/:id')
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Atualiza local', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ type: LocationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.update(id, dto);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Remove local', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ schema: { example: { message: 'Local deletado com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.delete(id);
  }
}
