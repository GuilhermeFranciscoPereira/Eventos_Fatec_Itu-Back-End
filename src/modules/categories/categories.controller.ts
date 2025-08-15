import { Role } from '@prisma/client';
import { RolesGuard } from '../../guards/roles.guard';
import { Public } from 'src/decorators/public.decorator';
import { CategoriesService } from './categories.service';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryPublicResponseDto } from './dto/category-public-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, HttpCode } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Public()
  @Get('publicAllCategories')
  async findAllPublic(): Promise<CategoryPublicResponseDto[]> {
    return this.categoriesService.findAllPublic();
  }

  @Get()
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll();
  }

  @Post('create')
  @HttpCode(201)
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Patch('patch/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.delete(id);
  }
}
