import { Transform } from 'class-transformer';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio ou apenas espaços' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
    name!: string;
}
