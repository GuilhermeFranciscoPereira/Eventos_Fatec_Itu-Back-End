import { Length, Matches } from 'class-validator';

export class LoginDto {
    @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
    @Matches(/^\d{6}$/, { message: 'Código deve conter apenas números' })
    code!: string;
}