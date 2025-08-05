import { Role, Location } from '@prisma/client';
import { EventsService } from './events.service';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventResponseDto } from './dto/event-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UploadedFile, UseGuards, UseInterceptors, HttpCode, ParseIntPipe, ParseEnumPipe } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('events')
export class EventsController {
  constructor(private service: EventsService) { }

  @Get()
  async findAll(): Promise<EventResponseDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.service.findOne(id);
  }

  @Post('create')
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  async create(@Body() dto: CreateEventDto, @UploadedFile() file: Express.Multer.File): Promise<EventResponseDto> {
    return this.service.create(dto, file);
  }

  @Patch('patch/:id')
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto, @UploadedFile() file?: Express.Multer.File): Promise<EventResponseDto> {
    return this.service.update(id, dto, file);
  }

  @Delete('delete/:id')
  @Roles(Role.ADMIN, Role.COORDENADOR)
  @HttpCode(200)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Get('availability/dates')
  async availabilityDates(@Query('location', new ParseEnumPipe(Location)) location: Location): Promise<string[]> {
    return this.service.getAvailableDates(location);
  }

  @Get('availability/times')
  async availabilityTimes(@Query('location', new ParseEnumPipe(Location)) location: Location, @Query('date') date: string, @Query('exceptId') exceptId?: string): Promise<{ start: string; end: string }[]> {
    return this.service.getAvailableTimes(location, date, exceptId ? Number(exceptId) : undefined);
  }
}
