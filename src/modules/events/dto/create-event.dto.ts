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
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(140)
    name!: string;

    @ApiProperty({
        example: 'Competição prática de desenvolvimento de soluções tecnológicas.',
        description: 'Descrição completa do evento.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    description!: string;

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Curso legado vinculado ao evento, quando usado por integrações antigas.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    courseId?: number;

    @ApiPropertyOptional({
        example: [1, 2],
        type: [Number],
        minimum: 1,
        description: 'Lista de cursos associados ao evento. Permite selecionar um ou mais cursos.',
    })
    @IsOptional()
    @Transform(({ value }) => toNumberArray(value))
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    courseIds?: number[];

    @ApiPropertyOptional({
        enum: Semester,
        example: Semester.ALL,
        description: 'Semestre permitido para inscrição, quando o evento for restrito.',
    })
    @IsOptional()
    @IsEnum(Semester)
    semester?: Semester;

    @ApiProperty({
        example: 100,
        minimum: 1,
        description: 'Quantidade máxima de participantes.',
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
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
    @IsBoolean()
    isRestricted!: boolean;

    @ApiProperty({
        example: 1,
        minimum: 1,
        description: 'Identificador do local cadastrado.',
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    locationId!: number;

    @ApiPropertyOptional({
        example: 'Pátio central',
        minLength: 3,
        maxLength: 140,
        description: 'Local customizado exibido para o evento quando necessário.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MinLength(3)
    @MaxLength(140)
    customLocation?: string;

    @ApiProperty({
        example: 'Prof. João Silva',
        minLength: 3,
        maxLength: 120,
        description: 'Nome do palestrante ou responsável.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(120)
    speakerName!: string;

    @ApiProperty({
        example: '2026-06-29T00:00:00.000Z',
        description: 'Data inicial do evento.',
    })
    @IsDateString()
    startDate!: string;

    @ApiPropertyOptional({
        example: '2026-07-03T00:00:00.000Z',
        nullable: true,
        description: 'Data final para eventos que acontecem em mais de um dia.',
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    @IsDateString()
    endDate?: string | null;

    @ApiProperty({
        example: '2026-06-29T08:00:00.000Z',
        description: 'Horário de início do evento.',
    })
    @IsDateString()
    startTime!: string;

    @ApiProperty({
        example: '2026-06-29T18:00:00.000Z',
        description: 'Horário de encerramento do evento.',
    })
    @IsDateString()
    endTime!: string;

    @ApiPropertyOptional({
        example: 480,
        minimum: 1,
        description: 'Duração em minutos, quando informada.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    duration?: number;

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Identificador da categoria do evento.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
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
    @IsString()
    @MaxLength(80)
    presenceSecret?: string | null;
}
