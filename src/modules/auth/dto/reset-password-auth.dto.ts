import { ApiProperty } from '@nestjs/swagger';
import { Matches, Length, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        example: '123456',
        minLength: 6,
        maxLength: 6,
        description: 'Código enviado por e-mail para autorizar a redefinição.',
    })
    @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
    @Matches(/^\d{6}$/, { message: 'Código deve conter apenas números' })
    code!: string;

    @ApiProperty({
        example: 'NovaSenha@123',
        minLength: 6,
        writeOnly: true,
        description: 'Nova senha do usuário. Não é retornada pela API.',
    })
    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
    newPassword!: string;
}
