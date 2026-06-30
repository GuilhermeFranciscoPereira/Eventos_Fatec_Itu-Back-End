import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador da categoria.' })
    id!: number;

    @ApiProperty({ example: 'Palestra', description: 'Nome da categoria.' })
    name!: string;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date;
}
