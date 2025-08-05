import { Transform } from 'class-transformer';
import { Course, Semester, Location } from '@prisma/client';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
    @Transform(({ value }) => value.trim())
    @IsString({ message: 'O nome do evento deve ser um texto.' })
    @IsNotEmpty({ message: 'O campo nome do evento é obrigatório.' })
    @MinLength(3, { message: 'O nome do evento precisa ter pelo menos 3 caracteres.' })
    @MaxLength(100, { message: 'O nome do evento não pode passar de 100 caracteres.' })
    name!: string;

    @Transform(({ value }) => value.trim())
    @IsString({ message: 'A descrição deve ser um texto.' })
    @IsNotEmpty({ message: 'O campo descrição é obrigatório.' })
    @MinLength(10, { message: 'A descrição precisa ter pelo menos 10 caracteres.' })
    @MaxLength(1000, { message: 'A descrição não pode passar de 1000 caracteres.' })
    description!: string;

    @IsEnum(Course, { message: 'O curso selecionado é inválido.' })
    course!: Course;

    @IsEnum(Semester, { message: 'O semestre selecionado é inválido.' })
    @IsOptional()
    semester?: Semester;

    @IsInt({ message: 'Número máximo de participantes deve ser um número inteiro.' })
    @Min(1, { message: 'Número máximo de participantes deve ser no mínimo 1.' })
    maxParticipants!: number;

    @IsBoolean({ message: 'É restrito deve ser selecionado ou não selecionado ( verdadeiro ou falso ).' })
    isRestricted!: boolean;

    @IsEnum(Location, { message: 'Localização inválida.' })
    location!: Location;

    @Transform(({ value }) => value?.trim())
    @IsOptional()
    @MinLength(3, { message: 'Localização customizada precisa ter pelo menos 3 caracteres.' })
    @MaxLength(100, { message: 'Localização customizada não pode passar de 100 caracteres.' })
    customLocation?: string;

    @Transform(({ value }) => value.trim())
    @IsString({ message: 'O nome do Palestrante/Responsável deve ser um texto.' })
    @IsNotEmpty({ message: 'O nome do Palestrante/Responsável é obrigatório.' })
    @MinLength(3, { message: 'O nome do Palestrante/Responsável precisa ter pelo menos 3 caracteres.' })
    @MaxLength(100, { message: 'O nome do Palestrante/Responsável não pode passar de 100 caracteres.' })
    speakerName!: string;

    @IsDateString({}, { message: 'O campo de data deve ser preenchido.' })
    startDate!: string;

    @IsDateString({}, { message: 'O campo de hora de início deve ser preenchido.' })
    startTime!: string;

    @IsDateString({}, { message: 'O campo de hora final deve ser preenchido.' })
    endTime!: string;

    @IsInt({ message: 'Duração deve ser um número inteiro.' })
    @IsOptional()
    duration?: number;

    @IsInt({ message: 'Categoria ID deve ser um inteiro.' })
    @IsOptional()
    categoryId?: number;
}
