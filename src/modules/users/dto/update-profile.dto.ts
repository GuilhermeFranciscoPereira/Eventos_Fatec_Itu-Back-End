import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, MinLength, Matches, MaxLength, IsNotEmpty } from 'class-validator';

// Only what a user may change about themselves: role and password stay with the admin routes.
export class UpdateProfileDto {
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
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br|cps\.sp\.gov\.br|aluno\.cps\.sp\.gov\.br)$/, {
        message: 'E-mail deve ser @fatec.sp.gov.br, @cms.sp.gov.br, @cps.sp.gov.br ou @aluno.cps.sp.gov.br',
    })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email?: string;
}
