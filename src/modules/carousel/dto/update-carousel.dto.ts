import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MinLength, MaxLength, Min } from 'class-validator';

export class UpdateCarouselDto {
    @ApiPropertyOptional({
        example: 'Semana de Tecnologia',
        minLength: 3,
        maxLength: 80,
        description: 'Novo nome do item do carrossel.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name?: string;

    @ApiPropertyOptional({
        example: 'https://res.cloudinary.com/demo/image/upload/carousel.jpg',
        description: 'URL da imagem já salva. Normalmente é preenchida pelo upload.',
    })
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Define se o item deve aparecer no carrossel público.',
    })
    @IsOptional()
    @IsBoolean({ message: 'isActive deve ser true ou false' })
    isActive?: boolean;

    @ApiPropertyOptional({
        example: 2,
        minimum: 1,
        description: 'Nova posição do item. A API reorganiza os demais itens para manter sequência contínua.',
    })
    @IsOptional()
    @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : Number(value))
    @IsInt({ message: 'Ordem deve ser um número inteiro' })
    @Min(1, { message: 'Ordem deve ser no mínimo 1' })
    order?: number;
}
