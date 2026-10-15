import { AuditOutcome } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const AUDIT_RESOURCES = ['auth', 'users', 'profile', 'events', 'participants', 'carousel', 'categories', 'courses', 'locations', 'other'] as const;
export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN_REQUEST', 'LOGIN', 'LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET', 'ACCESS_DENIED'] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class FindAuditLogsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1, description: 'Página desejada.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página deve ser no mínimo 1' })
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20, description: 'Quantidade de registros por página.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantidade por página deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade por página deve ser no mínimo 1' })
  @Max(100, { message: 'Quantidade por página deve ser no máximo 100' })
  pageSize?: number;

  @ApiPropertyOptional({ example: 'evento', maxLength: 120, description: 'Busca por responsável (nome ou e-mail), resumo ou registro afetado.' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Busca deve ser um texto' })
  @MaxLength(120, { message: 'Busca deve ter no máximo 120 caracteres' })
  search?: string;

  @ApiPropertyOptional({ enum: AuditOutcome, description: 'Resultado da operação.' })
  @IsOptional()
  @IsEnum(AuditOutcome, { message: 'Resultado inválido' })
  outcome?: AuditOutcome;

  @ApiPropertyOptional({ enum: AUDIT_RESOURCES, description: 'Área do sistema afetada.' })
  @IsOptional()
  @IsIn(AUDIT_RESOURCES, { message: 'Área inválida' })
  resource?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS, description: 'Tipo de ação.' })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS, { message: 'Ação inválida' })
  action?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Data inicial (horário de Brasília), no formato AAAA-MM-DD.' })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Data inicial deve estar no formato AAAA-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Data final (horário de Brasília), no formato AAAA-MM-DD.' })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Data final deve estar no formato AAAA-MM-DD' })
  to?: string;
}
