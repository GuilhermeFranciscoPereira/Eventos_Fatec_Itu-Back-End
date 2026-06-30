import { ApiProperty } from '@nestjs/swagger';
import { Length, Matches } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: '123456',
        minLength: 6,
        maxLength: 6,
        description: 'Código de 2FA enviado para o e-mail institucional.',
    })
    @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
    @Matches(/^\d{6}$/, { message: 'Código deve conter apenas números' })
    code!: string;
}
