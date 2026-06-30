import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-auth.dto';
import { RolesGuard } from '../../guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../decorators/roles.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Controller, Get, Patch, Delete, Param, Body, UseGuards, ParseIntPipe, Post, HttpCode, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista usuários', description: 'Rota privada para ADMIN.' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post('create')
  @HttpCode(201)
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Cria usuário', description: 'Rota privada para ADMIN.' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('patch/:id')
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Atualiza usuário', description: 'Rota privada para ADMIN.' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualiza perfil do usuário autenticado', description: 'Rota privada. Permite atualizar dados e foto de perfil.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Coordenador Fatec' },
        email: { type: 'string', example: 'coordenador@fatec.sp.gov.br' },
        password: { type: 'string', example: 'NovaSenha@123', writeOnly: true },
        role: { type: 'string', example: 'COORDENADOR' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async updatePersonalProfile(@Req() req: Request & { user: { userId: number } }, @UploadedFile() file: Express.Multer.File, @Body() dto: UpdateUserDto) {
    return this.usersService.updatePersonalProfile(req.user.userId, dto, file);
  }

  @Delete('delete/:id')
  @ApiCookieAuth('access-token')
  @ApiSecurity('csrf-token')
  @ApiOperation({ summary: 'Remove usuário', description: 'Rota privada para ADMIN.' })
  @ApiOkResponse({ schema: { example: { message: 'Usuário deletado com sucesso!' } } })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.delete(id);
  }
}
