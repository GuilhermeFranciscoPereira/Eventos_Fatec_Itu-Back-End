import { Role } from '@prisma/client';
import { CarouselService } from './carousel.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { CarouselResponseDto } from './dto/carousel-response.dto';
import { CarouselPublicResponseDto } from './dto/carousel-public-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, HttpCode, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';

@Controller('carousel')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) { }

  @Get('publicAllCarousel')
  async findAllPublic(): Promise<CarouselPublicResponseDto[]> {
    return this.carouselService.findAllPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @Get()
  async findAll(): Promise<CarouselResponseDto[]> {
    return this.carouselService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  async create(@Body() dto: CreateCarouselDto, @UploadedFile() file: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.create(dto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @Patch('patch/:id')
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCarouselDto, @UploadedFile() file?: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.update(id, dto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @Patch('patch/toggle/:id')
  @HttpCode(200)
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Body('isActive', ParseBoolPipe) isActive: boolean): Promise<CarouselResponseDto> {
    return this.carouselService.toggleActive(id, isActive);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.carouselService.delete(id);
  }
}
