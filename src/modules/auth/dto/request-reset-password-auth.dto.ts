import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength } from 'class-validator';

export class RequestResetPasswordDto {
    @ApiProperty({
        example: 'usuario@fatec.sp.gov.br',
        maxLength: 191,
        description: 'E-mail institucional que receberá o código de redefinição.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido' })
    @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br|cps\.sp\.gov\.br)$/, {
        message: 'E-mail deve ser @fatec.sp.gov.br, @cms.sp.gov.br ou @cps.sp.gov.br',
    })
    @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
    email!: string;
}
