import { Transform } from 'class-transformer';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateLocationDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name!: string;
}