import { Transform } from 'class-transformer';
import { Course, Semester } from '@prisma/client';
import { IsEmail, Matches, IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, Length, IsOptional } from 'class-validator';

export class CreateParticipantDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(120, { message: 'Nome deve ter no máximo 120 caracteres' })
    name!: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;

    @IsOptional()
    @IsEnum(Course, { message: 'Curso inválido' })
    course?: Course;

    @IsOptional()
    @IsEnum(Semester, { message: 'Semestre inválido' })
    semester?: Semester;

    @IsOptional()
    @Length(13, 13, { message: 'RA deve ter 13 dígitos' })
    @Matches(/^[0-9]{13}$/, { message: 'RA deve conter apenas números' })
    ra?: string;

    @IsInt({ message: 'eventId deve ser um número inteiro' })
    @Min(1, { message: 'eventId inválido' })
    eventId!: number;
}
