import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MinLength, MaxLength, Min, Matches } from 'class-validator';

export class UpdateCarouselDto {
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name?: string;

    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MaxLength(2048, { message: 'URL deve ter no máximo 2048 caracteres' })
    @Matches(/^https?:\/\/.+/i, { message: 'URL da imagem inválida' })
    imageUrl?: string;

    @IsOptional()
    @IsBoolean({ message: 'isActive deve ser true ou false' })
    isActive?: boolean;

    @IsOptional()
    @IsInt({ message: 'Ordem deve ser um número inteiro' })
    @Min(1, { message: 'Ordem deve ser no mínimo 1' })
    order?: number;
}
