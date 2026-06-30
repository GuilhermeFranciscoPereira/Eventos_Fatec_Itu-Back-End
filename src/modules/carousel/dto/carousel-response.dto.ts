import { ApiProperty } from '@nestjs/swagger';

export class CarouselResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do item do carrossel.' })
    id!: number;

    @ApiProperty({ example: 'Semana de Tecnologia', description: 'Nome do item.' })
    name!: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/carousel.jpg', description: 'URL da imagem.' })
    imageUrl!: string;

    @ApiProperty({ example: true, description: 'Indica se o item aparece publicamente.' })
    isActive!: boolean;

    @ApiProperty({ example: 1, description: 'Ordem de exibição do item.' })
    order!: number;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date;
}
