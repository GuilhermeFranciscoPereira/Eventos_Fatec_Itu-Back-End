import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCourseDto {
    @ApiPropertyOptional({
        example: 'Gestão da Tecnologia da Informação',
        minLength: 2,
        maxLength: 80,
        description: 'Novo nome do curso.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
    @MaxLength(80, { message: 'Nome deve ter no máximo 80 caracteres' })
    name?: string
}
