import { Matches, Length, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
    @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
    code: string;

    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @MaxLength(10, { message: 'Senha deve ter no máximo 10 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Deve conter ao menos um caractere especial' })
    newPassword: string;
}