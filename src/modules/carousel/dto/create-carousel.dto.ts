import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsBoolean, IsInt, MinLength, MaxLength, Min, IsOptional } from 'class-validator';

export class CreateCarouselDto {
    @ApiProperty({
        example: 'Semana de Tecnologia',
        minLength: 3,
        maxLength: 80,
        description: 'Nome do item do carrossel.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name!: string;

    @ApiProperty({
        example: true,
        description: 'Define se o item deve aparecer no carrossel público.',
    })
    @IsBoolean({ message: 'isActive deve ser true ou false' })
    isActive!: boolean;

    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
        description: 'Posição desejada na lista. Quando vazio, o item entra na última posição disponível.',
    })
    @IsOptional()
    @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : Number(value))
    @IsInt({ message: 'Ordem deve ser um número inteiro' })
    @Min(1, { message: 'Ordem deve ser no mínimo 1' })
    order?: number;
}
