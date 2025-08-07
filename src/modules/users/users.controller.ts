import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateDto } from './dto/create-auth.dto';
import { RolesGuard } from '../../guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../decorators/roles.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Controller, Get, Patch, Delete, Param, Body, UseGuards, ParseIntPipe, Post, HttpCode, Req, UploadedFile, UseInterceptors } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post('create')
  @HttpCode(201)
  async create(@Body() dto: CreateDto) {
    return this.usersService.create(dto);
  }

  @Patch('patch/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async updatePersonalProfile(@Req() req: Request & { user: { userId: number } }, @UploadedFile() file: Express.Multer.File, @Body() dto: UpdateUserDto) {
    return this.usersService.updatePersonalProfile(req.user.userId, dto, file);
  }

  @Delete('delete/:id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.delete(id);
  }
}
