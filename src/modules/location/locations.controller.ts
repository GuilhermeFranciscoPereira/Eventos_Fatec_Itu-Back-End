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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) { }

  @Public()
  @Get('publicAllLocations')
  async findAllPublic(): Promise<LocationPublicResponseDto[]> {
    return this.locationsService.findAllPublic();
  }

  @Get()
  async findAll(): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll();
  }

  @Post('create')
  @HttpCode(201)
  async create(@Body() dto: CreateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.create(dto);
  }

  @Patch('patch/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.update(id, dto);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.delete(id);
  }
}