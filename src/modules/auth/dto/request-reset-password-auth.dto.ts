import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength } from 'class-validator';

export class RequestResetPasswordDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/, { message: 'E-mail deve ser @fatec.sp.gov.br ou @cms.sp.gov.br' })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;
}
