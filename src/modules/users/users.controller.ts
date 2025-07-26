import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { RolesGuard } from '../../guards/roles.guard';
import { RegisterDto } from './dto/register-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../decorators/roles.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Controller, Get, Patch, Delete, Param, Body, UseGuards, ParseIntPipe, Post, HttpCode } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }
  
  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Patch('patch/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete('delete/:id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.remove(id);
  }
}
