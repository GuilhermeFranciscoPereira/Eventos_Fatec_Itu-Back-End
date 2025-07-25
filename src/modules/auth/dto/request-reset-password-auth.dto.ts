import { Matches } from 'class-validator';

export class RequestResetPasswordDto {
    @Matches(
        /@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/,
        { message: 'E-mail deve ser @fatec.sp.gov.br ou @cms.sp.gov.br' },
    )
    email: string;
}