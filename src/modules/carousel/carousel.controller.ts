import { Role } from '@prisma/client';
import { CarouselService } from './carousel.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { CarouselResponseDto } from './dto/carousel-response.dto';
import { CarouselPublicResponseDto } from './dto/carousel-public-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, HttpCode, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('carousel')
@ApiTags('Carousel')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) { }

  @Public()
  @Get('publicAllCarousel')
  @ApiOperation({ summary: 'Lista carrossel público', description: 'Rota pública. Retorna itens ativos para exibição no front-end.' })
  @ApiOkResponse({ type: CarouselPublicResponseDto, isArray: true })
  async findAllPublic(): Promise<CarouselPublicResponseDto[]> {
    return this.carouselService.findAllPublic();
  }

  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista itens do carrossel', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiOkResponse({ type: CarouselResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(): Promise<CarouselResponseDto[]> {
    return this.carouselService.findAll();
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cria item do carrossel', description: 'Rota privada para ADMIN e COORDENADOR. A ordem é reorganizada automaticamente quando informada.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'isActive', 'image'],
      properties: {
        name: { type: 'string', example: 'Semana de Tecnologia' },
        isActive: { type: 'boolean', example: true },
        order: { type: 'integer', minimum: 1, example: 1 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: CarouselResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async create(@Body() dto: CreateCarouselDto, @UploadedFile() file: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.create(dto, file);
  }

  @Patch('patch/:id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualiza item do carrossel', description: 'Rota privada para ADMIN e COORDENADOR. Pode alterar dados, imagem e posição do item.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Semana de Tecnologia' },
        isActive: { type: 'boolean', example: true },
        order: { type: 'integer', minimum: 1, example: 2 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: CarouselResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCarouselDto, @UploadedFile() file?: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.update(id, dto, file);
  }

  @Patch('patch/toggle/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Ativa ou desativa item do carrossel', description: 'Rota privada para ADMIN e COORDENADOR.' })
  @ApiBody({ schema: { example: { isActive: true } } })
  @ApiOkResponse({ type: CarouselResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Body('isActive', ParseBoolPipe) isActive: boolean): Promise<CarouselResponseDto> {
    return this.carouselService.toggleActive(id, isActive);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Remove item do carrossel', description: 'Rota privada para ADMIN e COORDENADOR. A sequência de ordem é reorganizada após a remoção.' })
  @ApiOkResponse({ schema: { example: { message: 'Imagem do carrossel deletada com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.carouselService.delete(id);
  }
}
