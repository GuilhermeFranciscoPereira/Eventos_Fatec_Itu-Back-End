import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCourseDto {
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name?: string
}
