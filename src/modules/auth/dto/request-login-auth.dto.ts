import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RequestLoginDto {
    @ApiProperty({
        example: 'usuario@fatec.sp.gov.br',
        maxLength: 191,
        description: 'E-mail institucional autorizado para iniciar o login.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br|cps\.sp\.gov\.br)$/, {
        message: 'E-mail deve ser @fatec.sp.gov.br, @cms.sp.gov.br ou @cps.sp.gov.br',
    })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;

    @ApiProperty({
        example: 'Senha@123',
        minLength: 6,
        writeOnly: true,
        description: 'Senha do usuário. Não é retornada pela API.',
    })
    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
    password!: string;
}
