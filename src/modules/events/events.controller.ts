import { Role, Location } from '@prisma/client';
import { EventsService } from './events.service';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventResponseDto } from './dto/event-response.dto';
import { EventPublicResponseDto } from './dto/event-public-response.dto';
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UploadedFile, UseGuards, UseInterceptors, HttpCode, ParseIntPipe, ParseEnumPipe } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COORDENADOR)
@Controller('events')
export class EventsController {
  constructor(private eventService: EventsService) { }

  @Public()
  @Get('publicAllEvents')
  async findAllPublic(): Promise<EventPublicResponseDto[]> {
    return this.eventService.findAllPublic();
  }

  @Roles(Role.ADMIN, Role.COORDENADOR, Role.AUXILIAR)
  @Get()
  async findAll(): Promise<EventResponseDto[]> {
    return this.eventService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventService.findOne(id);
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(201)
  async create(@Body() dto: CreateEventDto, @UploadedFile() file: Express.Multer.File): Promise<EventResponseDto> {
    return this.eventService.create(dto, file);
  }

  @Patch('patch/:id')
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto, @UploadedFile() file?: Express.Multer.File): Promise<EventResponseDto> {
    return this.eventService.update(id, dto, file);
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.remove(id);
  }

  @Get('availability/dates')
  async availabilityDates(@Query('location', new ParseEnumPipe(Location)) location: Location): Promise<string[]> {
    return this.eventService.getAvailableDates(location);
  }

  @Get('availability/times')
  async availabilityTimes(@Query('location', new ParseEnumPipe(Location)) location: Location, @Query('date') date: string, @Query('exceptId') exceptId?: string): Promise<{ start: string; end: string }[]> {
    return this.eventService.getAvailableTimes(location, date, exceptId ? Number(exceptId) : undefined);
  }
}
