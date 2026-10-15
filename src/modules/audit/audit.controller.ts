import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuditLogDetailResponseDto, AuditLogListResponseDto } from './dto/audit-log-response.dto';
import { ApiCookieAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit')
@ApiTags('Audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Lista registros de auditoria', description: 'Rota privada para ADMIN. Paginada, do mais recente para o mais antigo, com busca e filtros por resultado, área, ação e período.' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findAll(@Query() query: FindAuditLogsDto): Promise<AuditLogListResponseDto> {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Detalha um registro de auditoria', description: 'Rota privada para ADMIN. Retorna responsável, resultado, dados anteriores, posteriores, o que mudou, dados enviados e resposta, sem senhas, códigos ou tokens.' })
  @ApiOkResponse({ type: AuditLogDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Registro não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AuditLogDetailResponseDto> {
    return this.auditService.findOne(id);
  }
}
