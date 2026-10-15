import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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

    @ApiProperty({
        example: 'maria@fatec.sp.gov.br',
        maxLength: 191,
        description: 'E-mail usado na inscrição do participante.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;
}
