import { Transform } from 'class-transformer';
import { Course, Semester, Location } from '@prisma/client';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString, Matches } from 'class-validator';

export class CreateEventDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome do evento deve ser um texto' })
    @IsNotEmpty({ message: 'Nome do evento é obrigatório' })
    @MinLength(3, { message: 'Nome do evento deve ter ao menos 3 caracteres' })
    @MaxLength(140, { message: 'Nome do evento deve ter no máximo 140 caracteres' })
    name!: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Descrição deve ser um texto' })
    @IsNotEmpty({ message: 'Descrição é obrigatória' })
    description!: string;

    @IsNotEmpty({ message: 'URL da imagem é obrigatória' })
    imageUrl!: string;

    @IsEnum(Course, { message: 'Curso inválido' })
    course!: Course;

    @IsOptional()
    @IsEnum(Semester, { message: 'Semestre inválido' })
    semester?: Semester;

    @IsInt({ message: 'Número máximo de participantes deve ser inteiro' })
    @Min(1, { message: 'Número máximo de participantes deve ser no mínimo 1' })
    maxParticipants!: number;

    @IsBoolean({ message: 'isRestricted deve ser true ou false' })
    isRestricted!: boolean;

    @IsEnum(Location, { message: 'Localização inválida' })
    location!: Location;

    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MinLength(3, { message: 'Localização customizada deve ter ao menos 3 caracteres' })
    @MaxLength(140, { message: 'Localização customizada deve ter no máximo 140 caracteres' })
    customLocation?: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome do palestrante deve ser um texto' })
    @IsNotEmpty({ message: 'Nome do palestrante é obrigatório' })
    @MinLength(3, { message: 'Nome do palestrante deve ter ao menos 3 caracteres' })
    @MaxLength(120, { message: 'Nome do palestrante deve ter no máximo 120 caracteres' })
    speakerName!: string;

    @IsDateString({}, { message: 'Data inicial inválida' })
    startDate!: string;

    @IsDateString({}, { message: 'Hora de início inválida' })
    startTime!: string;

    @IsDateString({}, { message: 'Hora final inválida' })
    endTime!: string;

    @IsOptional()
    @IsInt({ message: 'Duração deve ser um número inteiro' })
    @Min(1, { message: 'Duração deve ser no mínimo 1' })
    duration?: number;

    @IsOptional()
    @IsInt({ message: 'categoryId deve ser inteiro' })
    @Min(1, { message: 'categoryId inválido' })
    categoryId?: number;
}
