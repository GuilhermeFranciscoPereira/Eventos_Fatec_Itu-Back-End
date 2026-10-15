import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditOutcome, Role } from '@prisma/client';

export class AuditLogSummaryDto {
  @ApiProperty({ example: 5080915, description: 'Número do registro.' })
  id!: number;

  @ApiProperty({ example: '2026-10-15T11:33:54.000Z', description: 'Momento da operação (UTC).' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 10, nullable: true, description: 'Identificador do responsável. Vazio quando a ação foi feita sem login.' })
  actorId!: number | null;

  @ApiPropertyOptional({ example: 'Guilherme Pereira', nullable: true, description: 'Nome do responsável na ocasião.' })
  actorName!: string | null;

  @ApiPropertyOptional({ example: 'guilherme@fatec.sp.gov.br', nullable: true, description: 'E-mail do responsável na ocasião.' })
  actorEmail!: string | null;

  @ApiPropertyOptional({ enum: Role, nullable: true, description: 'Perfil do responsável na ocasião.' })
  actorRole!: Role | null;

  @ApiProperty({ example: 'UPDATE', description: 'Tipo de ação.' })
  action!: string;

  @ApiProperty({ example: 'events', description: 'Área do sistema afetada.' })
  resource!: string;

  @ApiProperty({ example: 'Edição de evento', description: 'Resumo do que aconteceu.' })
  summary!: string;

  @ApiPropertyOptional({ example: '3', nullable: true, description: 'Identificador do registro afetado.' })
  targetId!: string | null;

  @ApiPropertyOptional({ example: 'Hackathon Fatec Itu', nullable: true, description: 'Nome do registro afetado.' })
  targetLabel!: string | null;

  @ApiProperty({ enum: AuditOutcome, description: 'Resultado da operação.' })
  outcome!: AuditOutcome;

  @ApiProperty({ example: 200, description: 'Código HTTP da resposta.' })
  statusCode!: number;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: AuditLogSummaryDto, isArray: true })
  items!: AuditLogSummaryDto[];

  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 6 })
  totalPages!: number;
}

export class AuditLogDetailResponseDto extends AuditLogSummaryDto {
  @ApiProperty({ example: 'PATCH' })
  method!: string;

  @ApiProperty({ example: '/apiEvents/events/patch/3' })
  path!: string;

  @ApiPropertyOptional({ example: '177.10.20.30', nullable: true })
  ip!: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true, description: 'Mensagem de erro, quando a operação falhou ou foi recusada.' })
  errorMessage!: string | null;

  @ApiPropertyOptional({ description: 'Todos os dados do registro antes da operação. Senhas, códigos, tokens e segredos aparecem como [PROTEGIDO].' })
  before!: unknown;

  @ApiPropertyOptional({ description: 'Todos os dados do registro depois da operação.' })
  after!: unknown;

  @ApiPropertyOptional({ description: 'Lista campo a campo do que mudou: { field, before, after, sensitive? }.' })
  changes!: unknown;

  @ApiPropertyOptional({ description: 'Dados enviados na operação, sem credenciais.' })
  requestBody!: unknown;

  @ApiPropertyOptional({ description: 'Resposta devolvida pela API, sem credenciais.' })
  response!: unknown;

  @ApiPropertyOptional({ description: 'Informações extras, como a otimização de uma imagem pesada.' })
  details!: unknown;
}
