import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do local.' })
    id!: number;

    @ApiProperty({ example: 'Auditório Principal', description: 'Nome do local.' })
    name!: string;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date;
}
