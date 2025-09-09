import { Transform } from 'class-transformer';
import { IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RequestLoginDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/, { message: 'E-mail deve ser @fatec.sp.gov.br ou @cms.sp.gov.br' })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;

    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @MaxLength(10, { message: 'Senha deve ter no máximo 10 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
    password!: string;
}
