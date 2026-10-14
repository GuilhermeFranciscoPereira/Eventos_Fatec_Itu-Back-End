import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Semester } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsOptional } from 'class-validator'
import { IsFatecRa } from '../validators/fatec-ra.validator'

export class CreateParticipantDto {
    @ApiProperty({
        example: 'Maria Oliveira',
        minLength: 3,
        maxLength: 120,
        description: 'Nome completo do participante.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(120, { message: 'Nome deve ter no máximo 120 caracteres' })
    name!: string

    @ApiProperty({
        example: 'maria@fatec.sp.gov.br',
        maxLength: 191,
        description: 'E-mail do participante.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Identificador do curso do participante.',
    })
    @IsOptional()
    @IsInt({ message: 'Curso inválido' })
    @Min(1, { message: 'Curso inválido' })
    courseId?: number

    @ApiPropertyOptional({
        enum: Semester,
        example: Semester.SEMESTER3,
        description: 'Semestre do participante, quando aplicável.',
    })
    @IsOptional()
    @IsEnum(Semester, { message: 'Semestre inválido' })
    semester?: Semester

    @ApiPropertyOptional({
        example: '0480482511001',
        minLength: 13,
        maxLength: 13,
        description: 'RA do aluno (13 dígitos no formato do SIGA: unidade, curso, ano, semestre, turno e sequência), quando houver.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s.\-/]/g, '') : value)
    @IsFatecRa()
    ra?: string

    @ApiProperty({
        example: 1,
        minimum: 1,
        description: 'Identificador do evento em que o participante será inscrito.',
    })
    @IsInt({ message: 'Evento inválido' })
    @Min(1, { message: 'Evento inválido' })
    eventId!: number
}
