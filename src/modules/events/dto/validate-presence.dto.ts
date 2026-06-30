import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ValidatePresenceDto {
    @ApiProperty({
        example: 'presenca-hackathon',
        minLength: 3,
        maxLength: 80,
        description: 'Palavra secreta definida para confirmar presença no evento.',
    })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MinLength(3)
    @MaxLength(80)
    presenceSecret!: string;
}
