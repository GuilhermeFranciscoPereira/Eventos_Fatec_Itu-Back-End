import { ApiProperty } from '@nestjs/swagger'

export class CourseResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do curso.' })
    id!: number

    @ApiProperty({ example: 'Análise e Desenvolvimento de Sistemas', description: 'Nome do curso.' })
    name!: string

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date
}
