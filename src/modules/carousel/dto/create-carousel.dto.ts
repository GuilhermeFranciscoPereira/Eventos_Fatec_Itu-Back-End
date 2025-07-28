import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsBoolean, IsInt, MinLength, MaxLength, Min } from 'class-validator';

export class CreateCarouselDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio ou apenas espaços' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
    name!: string;

    @IsBoolean()
    isActive!: boolean;

    @IsNotEmpty({ message: 'Deve ter a ordem da imagem' })
    @IsInt()
    @Min(1, { message: 'Ordem deve ser no mínimo 1.' })
    order!: number;
}
