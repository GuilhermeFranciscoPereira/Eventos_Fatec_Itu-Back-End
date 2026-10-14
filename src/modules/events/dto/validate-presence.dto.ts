import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ValidatePresenceDto {
    @ApiProperty({
        example: 'presenca-hackathon',
        minLength: 3,
        maxLength: 80,
        description: 'Palavra secreta definida para confirmar presença no evento.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Palavra secreta deve ser um texto.' })
    @MinLength(3, { message: 'Palavra secreta deve ter ao menos 3 caracteres.' })
    @MaxLength(80, { message: 'Palavra secreta deve ter no máximo 80 caracteres.' })
    presenceSecret!: string;
}
