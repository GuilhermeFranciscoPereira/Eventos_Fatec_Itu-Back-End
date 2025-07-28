import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MinLength, MaxLength, Min } from 'class-validator';

export class UpdateCarouselDto {
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio ou apenas espaços' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
    name?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') return value === 'true';
        if (typeof value === 'boolean') return value;
        return false;
    })
    @IsBoolean({ message: 'isActive deve ser true ou false.' })
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1, { message: 'Ordem deve ser no mínimo 1.' })
    order?: number;
}
