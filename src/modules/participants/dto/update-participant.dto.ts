import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateParticipantDto {
    @ApiProperty({
        example: true,
        description: 'Define se o participante está presente no evento.',
    })
    @IsBoolean({ message: 'Informe se o participante está presente.' })
    isPresent!: boolean;
}
