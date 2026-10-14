import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Semester } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';

function toNumberArray(value: unknown): number[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (value === '') return [];

    let rawValues: unknown[];

    if (Array.isArray(value)) {
        rawValues = value;
    } else if (typeof value === 'string' && value.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(value);
            rawValues = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            rawValues = [value];
        }
    } else if (typeof value === 'string' && value.includes(',')) {
        rawValues = value.split(',');
    } else {
        rawValues = [value];
    }

    return rawValues.map((item) => Number(item));
}

export class CreateEventDto {
    @ApiProperty({
        example: 'Hackathon Fatec Itu',
        minLength: 3,
        maxLength: 140,
        description: 'Nome do evento.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome do evento deve ser um texto.' })
    @IsNotEmpty({ message: 'Informe o nome do evento.' })
    @MinLength(3, { message: 'Nome do evento deve ter ao menos 3 caracteres.' })
    @MaxLength(140, { message: 'Nome do evento deve ter no máximo 140 caracteres.' })
    name!: string;

    @ApiProperty({
        example: 'Competição prática de desenvolvimento de soluções tecnológicas.',
        description: 'Descrição completa do evento.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Descrição deve ser um texto.' })
    @IsNotEmpty({ message: 'Informe a descrição do evento.' })
    description!: string;

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Curso legado vinculado ao evento, quando usado por integrações antigas.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Curso inválido.' })
    @Min(1, { message: 'Curso inválido.' })
    courseId?: number;

    @ApiPropertyOptional({
        example: [1, 2],
        type: [Number],
        minimum: 1,
        description: 'Lista de cursos associados ao evento. Permite selecionar um ou mais cursos.',
    })
    @IsOptional()
    @Transform(({ value }) => toNumberArray(value))
    @IsArray({ message: 'Lista de cursos inválida.' })
    @ArrayUnique({ message: 'Não repita cursos na lista.' })
    @IsInt({ each: true, message: 'Curso inválido na lista de cursos.' })
    @Min(1, { each: true, message: 'Curso inválido na lista de cursos.' })
    courseIds?: number[];

    @ApiPropertyOptional({
        enum: Semester,
        example: Semester.ALL,
        description: 'Semestre permitido para inscrição, quando o evento for restrito.',
    })
    @IsOptional()
    @IsEnum(Semester, { message: 'Semestre inválido.' })
    semester?: Semester;

    @ApiProperty({
        example: 100,
        minimum: 1,
        description: 'Quantidade máxima de participantes.',
    })
    @Type(() => Number)
    @IsInt({ message: 'Limite de participantes deve ser um número inteiro.' })
    @Min(1, { message: 'Limite de participantes deve ser no mínimo 1.' })
    maxParticipants!: number;

    @ApiProperty({
        example: true,
        description: 'Define se o evento é restrito a cursos e semestres específicos.',
    })
    @Transform(({ value }) => {
        if (value === true || value === 'true') return true
        if (value === false || value === 'false') return false
        return Boolean(value)
    })
    @IsBoolean({ message: 'Informe se o evento é restrito.' })
    isRestricted!: boolean;

    @ApiProperty({
        example: 1,
        minimum: 1,
        description: 'Identificador do local cadastrado.',
    })
    @Type(() => Number)
    @IsInt({ message: 'Selecione um local válido.' })
    @Min(1, { message: 'Selecione um local válido.' })
    locationId!: number;

    @ApiPropertyOptional({
        example: 'Pátio central',
        minLength: 3,
        maxLength: 140,
        description: 'Local customizado exibido para o evento quando necessário.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MinLength(3, { message: 'Local personalizado deve ter ao menos 3 caracteres.' })
    @MaxLength(140, { message: 'Local personalizado deve ter no máximo 140 caracteres.' })
    customLocation?: string;

    @ApiProperty({
        example: 'Prof. João Silva',
        minLength: 3,
        maxLength: 120,
        description: 'Nome do palestrante ou responsável.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome do palestrante deve ser um texto.' })
    @IsNotEmpty({ message: 'Informe o nome do palestrante.' })
    @MinLength(3, { message: 'Nome do palestrante deve ter ao menos 3 caracteres.' })
    @MaxLength(120, { message: 'Nome do palestrante deve ter no máximo 120 caracteres.' })
    speakerName!: string;

    @ApiProperty({
        example: '2026-06-29T00:00:00.000Z',
        description: 'Data inicial do evento.',
    })
    @IsDateString({}, { message: 'Data inicial inválida.' })
    startDate!: string;

    @ApiPropertyOptional({
        example: '2026-07-03T00:00:00.000Z',
        nullable: true,
        description: 'Data final para eventos que acontecem em mais de um dia.',
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    @IsDateString({}, { message: 'Data final inválida.' })
    endDate?: string | null;

    @ApiProperty({
        example: '2026-06-29T08:00:00.000Z',
        description: 'Horário de início do evento.',
    })
    @IsDateString({}, { message: 'Horário de início inválido.' })
    startTime!: string;

    @ApiProperty({
        example: '2026-06-29T18:00:00.000Z',
        description: 'Horário de encerramento do evento.',
    })
    @IsDateString({}, { message: 'Horário de término inválido.' })
    endTime!: string;

    @ApiPropertyOptional({
        example: 480,
        minimum: 1,
        description: 'Duração em minutos, quando informada.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Duração deve ser um número inteiro de minutos.' })
    @Min(1, { message: 'Duração deve ser de no mínimo 1 minuto.' })
    duration?: number;

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Identificador da categoria do evento.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Selecione uma categoria válida.' })
    @Min(1, { message: 'Selecione uma categoria válida.' })
    categoryId?: number;

    @ApiPropertyOptional({
        example: 'presenca-hackathon',
        nullable: true,
        maxLength: 80,
        description: 'Palavra secreta usada para validação de presença.',
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === null) return null;
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed || null;
    })
    @IsString({ message: 'Palavra secreta deve ser um texto.' })
    @MaxLength(80, { message: 'Palavra secreta deve ter no máximo 80 caracteres.' })
    presenceSecret?: string | null;
}
