import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class FindEventsByParticipantEmailDto {
    @ApiProperty({
        example: 'aluno@fatec.sp.gov.br',
        description: 'E-mail usado pelo participante na inscrição.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
    @IsEmail({}, { message: 'Formato de e-mail inválido.' })
    @IsNotEmpty({ message: 'Informe o e-mail usado na inscrição.' })
    email!: string;
}
