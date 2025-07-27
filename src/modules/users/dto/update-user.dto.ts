import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, MinLength, IsEnum, Matches, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio ou apenas espaços' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
    name?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(
        /@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/,
        { message: 'E-mail deve ser @fatec.sp.gov.br ou @cms.sp.gov.br' },
    )
    email?: string;

    @IsOptional()
    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @MaxLength(10, { message: 'Senha deve ter no máximo 10 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
    password?: string;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}
