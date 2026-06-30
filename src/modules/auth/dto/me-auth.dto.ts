import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class MeResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do usuário autenticado.' })
    sub!: number;

    @ApiProperty({ example: 'Guilherme Pereira', description: 'Nome do usuário autenticado.' })
    name!: string;

    @ApiPropertyOptional({
        example: 'https://res.cloudinary.com/demo/image/upload/profile.jpg',
        description: 'URL da foto de perfil, quando cadastrada.',
    })
    imageUrl?: string;

    @ApiProperty({ example: 'usuario@fatec.sp.gov.br', description: 'E-mail institucional do usuário.' })
    email!: string;

    @ApiProperty({ enum: Role, example: Role.ADMIN, description: 'Perfil de acesso do usuário.' })
    role!: Role;

    @ApiProperty({ example: 1719878400, description: 'Timestamp de expiração do access token.' })
    exp!: number;

    @ApiProperty({ example: 1719877500, description: 'Timestamp de emissão do access token.' })
    iat!: number;
}
