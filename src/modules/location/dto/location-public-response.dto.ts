import { ApiProperty } from '@nestjs/swagger';

export class LocationPublicResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do local.' })
    id!: number;

    @ApiProperty({ example: 'Auditório Principal', description: 'Nome público do local.' })
    name!: string;
}
