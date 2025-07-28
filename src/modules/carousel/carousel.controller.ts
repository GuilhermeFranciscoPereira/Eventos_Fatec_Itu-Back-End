import { Role } from '@prisma/client';
import { CarouselService } from './carousel.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { CarouselResponseDto } from './dto/carousel-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, HttpCode, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('carousel')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) { }

  @Get()
  async findAll(): Promise<CarouselResponseDto[]> {
    return this.carouselService.findAll();
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  async create(@Body() dto: CreateCarouselDto, @UploadedFile() file: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.create(dto, file);
  }

  @Patch('patch/:id')
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCarouselDto, @UploadedFile() file?: Express.Multer.File): Promise<CarouselResponseDto> {
    return this.carouselService.update(id, dto, file);
  }

  @Patch('patch/toggle/:id')
  @HttpCode(200)
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Body('isActive', ParseBoolPipe) isActive: boolean): Promise<CarouselResponseDto> {
    return this.carouselService.toggleActive(id, isActive);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.carouselService.delete(id);
  }
}
