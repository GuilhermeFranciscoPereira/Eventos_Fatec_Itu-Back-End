import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do usuário.' })
    id!: number;

    @ApiProperty({ example: 'Coordenador Fatec', description: 'Nome do usuário.' })
    name!: string;

    @ApiProperty({ example: 'coordenador@fatec.sp.gov.br', description: 'E-mail institucional do usuário.' })
    email!: string;

    @ApiProperty({ enum: Role, example: Role.COORDENADOR, description: 'Perfil de acesso do usuário.' })
    role!: Role;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date;
}
