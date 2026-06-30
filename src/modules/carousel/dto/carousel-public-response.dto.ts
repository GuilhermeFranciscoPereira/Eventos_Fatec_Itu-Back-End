import { ApiProperty } from '@nestjs/swagger';

export class CarouselPublicResponseDto {
    @ApiProperty({ example: 'Semana de Tecnologia', description: 'Nome público do item.' })
    name!: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/carousel.jpg', description: 'URL da imagem.' })
    imageUrl!: string;

    @ApiProperty({ example: true, description: 'Indica se o item está ativo.' })
    isActive!: boolean;

    @ApiProperty({ example: 1, description: 'Ordem de exibição pública.' })
    order!: number;
}
