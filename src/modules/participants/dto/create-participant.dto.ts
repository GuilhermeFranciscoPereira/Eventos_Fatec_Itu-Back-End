import { Transform } from 'class-transformer';
import { Course, Semester } from '@prisma/client';
import { IsEmail, Matches, IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, Length, IsOptional } from 'class-validator';

export class CreateParticipantDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
    name!: string;

    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @IsNotEmpty({ message: 'E-mail não pode ser vazio' })
    email!: string;

    @IsOptional()
    @IsEnum(Course, { message: 'Curso inválido' })
    course!: Course;

    @IsOptional()
    @IsEnum(Semester, { message: 'Semestre inválido' })
    semester!: Semester;

    @IsOptional()
    @Length(13, 13, { message: 'RA inválido' })
    @IsNotEmpty({ message: 'RA não pode ser vazio' })
    @Matches(/^[0-9]{13}$/, { message: 'RA deve conter apenas números' })
    ra!: string;

    @IsInt({ message: 'EventId deve ser um número inteiro' })
    @Min(1, { message: 'EventId inválido' })
    eventId!: number;
}
