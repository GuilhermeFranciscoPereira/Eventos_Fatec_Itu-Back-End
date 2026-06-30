import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, MinLength, IsEnum, Matches, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({
        example: 'Coordenador Fatec',
        minLength: 3,
        maxLength: 120,
        description: 'Novo nome do usuário.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome não pode ser vazio' })
    @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
    @MaxLength(120, { message: 'Nome deve ter no máximo 120 caracteres' })
    name?: string;

    @ApiPropertyOptional({
        example: 'coordenador@fatec.sp.gov.br',
        maxLength: 191,
        description: 'Novo e-mail institucional do usuário.',
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br|cps\.sp\.gov\.br)$/, {
        message: 'E-mail deve ser @fatec.sp.gov.br, @cms.sp.gov.br ou @cps.sp.gov.br',
    }) @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email?: string;

    @ApiPropertyOptional({
        example: 'NovaSenha@123',
        minLength: 6,
        writeOnly: true,
        description: 'Nova senha do usuário. Não é retornada pela API.',
    })
    @IsOptional()
    @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
    @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
    password?: string;

    @ApiPropertyOptional({
        enum: Role,
        example: Role.ADMIN,
        description: 'Novo perfil de acesso do usuário.',
    })
    @IsOptional()
    @IsEnum(Role, { message: 'Papel inválido' })
    role?: Role;

    @ApiPropertyOptional({
        example: 'https://res.cloudinary.com/demo/image/upload/profile.jpg',
        description: 'URL da imagem de perfil.',
    })
    @IsOptional()
    imageUrl?: string;
}
