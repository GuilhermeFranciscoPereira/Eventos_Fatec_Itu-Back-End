import { ApiProperty } from '@nestjs/swagger';

export class CategoryPublicResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador da categoria.' })
    id!: number;

    @ApiProperty({ example: 'Palestra', description: 'Nome público da categoria.' })
    name!: string;
}
